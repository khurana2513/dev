"""
Duel Mode – HTTP + WebSocket routes.

Endpoints
─────────
POST  /duel/rooms                     Create a room (auth required)
GET   /duel/rooms/{code}              Get room state (public – for join page)
POST  /duel/rooms/{code}/join         Join a room (auth required)
POST  /duel/rooms/{code}/ws-ticket    Get short-lived WS auth ticket (auth required)
WS    /duel/ws/{code}?ticket=…        WebSocket connection (ticket auth)
"""

from __future__ import annotations

import json
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from auth import get_current_user
from duel_manager import duel_manager
from models import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/duel", tags=["duel"])


# ── Pydantic schemas ─────────────────────────────────────────────────────────

class SelectedComboSchema(BaseModel):
    opType:      str
    optionValue: str


class DuelConfigSchema(BaseModel):
    type:        str                          # "single" | "mix"
    opType:      Optional[str]       = None
    optionValue: Optional[str]       = None
    combos:      Optional[List[SelectedComboSchema]] = None


class CreateRoomRequest(BaseModel):
    config: DuelConfigSchema


# ── HTTP Endpoints ───────────────────────────────────────────────────────────

@router.post("/rooms")
async def create_room(
    body:         CreateRoomRequest,
    current_user: User = Depends(get_current_user),
):
    """Create a duel room.  Returns full room state including the room code."""
    name   = current_user.display_name or current_user.name
    config = body.config.dict()
    room   = await duel_manager.create_room(current_user.id, name, config)
    return room


@router.get("/rooms/{code}")
async def get_room(code: str):
    """Fetch room state.  Public so the join page can show info before auth."""
    room = await duel_manager.get_room(code.upper())
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return room


@router.post("/rooms/{code}/join")
async def join_room(
    code:         str,
    current_user: User = Depends(get_current_user),
):
    """Join a lobby.  Returns updated player list."""
    code = code.upper()
    room = await duel_manager.get_room(code)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    if room["state"] not in ("lobby",):
        raise HTTPException(status_code=409, detail="Game already in progress")

    name = current_user.display_name or current_user.name
    try:
        players = await duel_manager.join_room(code, current_user.id, name)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))

    return {"code": code, "players": players}


@router.post("/rooms/{code}/ws-ticket")
async def get_ws_ticket(
    code:         str,
    current_user: User = Depends(get_current_user),
):
    """Issue a single-use 60-second WS auth ticket for the given room."""
    code = code.upper()
    room = await duel_manager.get_room(code)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    name   = current_user.display_name or current_user.name
    ticket = await duel_manager.create_ws_ticket(current_user.id, name)
    return {"ticket": ticket, "expires_in": 60}


# ── WebSocket Endpoint ───────────────────────────────────────────────────────

@router.websocket("/ws/{code}")
async def duel_websocket(
    websocket: WebSocket,
    code:      str,
    ticket:    str = Query(...),
):
    """
    Main real-time channel for a duel room.

    Authentication: ticket query parameter (from POST /rooms/{code}/ws-ticket).
    The ticket is consumed on first use (single-use).
    """
    code = code.upper()

    # ── 1. Authenticate via ticket ──────────────────────────────────────────
    identity = await duel_manager.consume_ws_ticket(ticket)
    if not identity:
        await websocket.close(code=4001, reason="Invalid or expired ticket")
        return

    user_id:   int = identity["user_id"]
    user_name: str = identity["user_name"]

    # ── 2. Room must exist ──────────────────────────────────────────────────
    room = await duel_manager.get_room(code)
    if not room:
        await websocket.close(code=4004, reason="Room not found")
        return

    # ── 3. Accept and register ──────────────────────────────────────────────
    await websocket.accept()
    await duel_manager.ws_connect(code, user_id, websocket)

    try:
        # Send full room snapshot to the newly-connected player
        fresh_room = await duel_manager.get_room(code)
        await duel_manager.send_to(code, user_id, {
            "type":    "ROOM_STATE",
            "payload": fresh_room,
        })

        # Notify everyone else that this player appeared
        await duel_manager.broadcast(code, {
            "type":    "PLAYER_JOINED",
            "payload": {"player": {"id": user_id, "name": user_name}},
        }, exclude=user_id)

        # ── 4. Message receive loop ─────────────────────────────────────────
        while True:
            try:
                raw  = await websocket.receive_text()
                msg  = json.loads(raw)
            except Exception:
                break  # connection closed or malformed JSON

            msg_type: str = msg.get("type", "")
            payload:  dict= msg.get("payload", {})

            # Re-fetch room state so we have fresh data for every message
            room = await duel_manager.get_room(code)
            if not room:
                break

            # ── START ───────────────────────────────────────────────────────
            if msg_type == "START":
                if room["host_id"] == user_id and room["state"] == "lobby":
                    players = room["players"]
                    if len(players) < 2:
                        await duel_manager.send_to(code, user_id, {
                            "type":    "ERROR",
                            "payload": {
                                "code":    "NOT_ENOUGH_PLAYERS",
                                "message": "Need at least 2 players to start",
                            },
                        })
                        continue
                    duel_manager.start_countdown(code, room["seed"])

            # ── SCORE_UPDATE (live trickle during game) ─────────────────────
            elif msg_type == "SCORE_UPDATE":
                if room["state"] == "playing":
                    correct = int(payload.get("correct", 0))
                    wrong   = int(payload.get("wrong",   0))
                    pts     = int(payload.get("points",  0))
                    await duel_manager.update_score(code, user_id, correct, wrong, pts)
                    # Relay to other players
                    await duel_manager.broadcast(code, {
                        "type":    "LIVE_SCORE",
                        "payload": {"userId": user_id, "correct": correct, "wrong": wrong},
                    }, exclude=user_id)

            # ── FINISH (player's 60 s timer expired, submitting results) ────
            elif msg_type == "FINISH":
                if room["state"] in ("playing", "finishing"):
                    correct  = int(payload.get("correct",  0))
                    wrong    = int(payload.get("wrong",    0))
                    pts      = int(payload.get("points",   0))

                    await duel_manager.update_score(
                        code, user_id, correct, wrong, pts, finished=True
                    )
                    await duel_manager.mark_player_finished(code, user_id)
                    await duel_manager.update_state(code, "finishing")

                    await duel_manager.broadcast(code, {
                        "type":    "PLAYER_FINISHED",
                        "payload": {"userId": user_id},
                    })

                    # If every *connected* player has finished → emit ALL_FINISHED
                    refreshed = await duel_manager.get_room(code)
                    if refreshed:
                        connected = set(duel_manager.get_connected_ids(code))
                        all_done  = all(
                            p["is_finished"]
                            for p in refreshed["players"]
                            if p["id"] in connected
                        )
                        if all_done and connected:
                            rankings = _build_rankings(refreshed)
                            await duel_manager.update_state(code, "results")
                            await duel_manager.broadcast(code, {
                                "type":    "ALL_FINISHED",
                                "payload": {"rankings": rankings},
                            })

            # ── PING / keepalive ────────────────────────────────────────────
            elif msg_type == "PING":
                await duel_manager.send_to(code, user_id, {
                    "type": "PONG", "payload": {},
                })

    except WebSocketDisconnect:
        pass
    except Exception as exc:
        logger.warning("[DUEL WS] Unexpected error – user=%s room=%s: %s", user_id, code, exc)
    finally:
        # ── Cleanup ─────────────────────────────────────────────────────────
        await duel_manager.ws_disconnect(code, user_id)

        remaining, new_host = await duel_manager.remove_player(code, user_id)

        leave_payload: dict = {"userId": user_id, "players": remaining}
        if new_host is not None:
            leave_payload["newHostId"] = new_host

        await duel_manager.broadcast(code, {
            "type":    "PLAYER_LEFT",
            "payload": leave_payload,
        })

        # If host left during countdown, cancel it and revert to lobby
        room = await duel_manager.get_room(code)
        if room and room["state"] == "countdown":
            duel_manager.cancel_countdown(code)
            await duel_manager.update_state(code, "lobby")
            fresh = await duel_manager.get_room(code)
            if fresh:
                await duel_manager.broadcast(code, {
                    "type":    "ROOM_STATE",
                    "payload": fresh,
                })


# ── Helpers ──────────────────────────────────────────────────────────────────

def _build_rankings(room: dict) -> list:
    """Derive sorted rankings from room state (scores + players)."""
    scores  = room.get("scores",  {})
    players = room.get("players", [])

    rankings = []
    for player in players:
        uid   = player["id"]
        score = scores.get(uid, {})
        rankings.append({
            "userId":   uid,
            "name":     player["name"],
            "correct":  score.get("correct",  0),
            "wrong":    score.get("wrong",    0),
            "points":   score.get("points",   0),
            "finished": score.get("finished", False),
        })

    # Primary sort: most correct; secondary: fewest wrong; tertiary: name
    rankings.sort(key=lambda r: (-r["correct"], r["wrong"], r["name"]))

    for i, r in enumerate(rankings):
        r["rank"] = i + 1

    return rankings
