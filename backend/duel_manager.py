"""
DuelManager – manages room state (via Redis) and WebSocket connections (in-memory).

Architecture
────────────
• Redis: room metadata, player list, live scores
• In-memory dict: active WebSocket connections on this worker
• asyncio.Task: server-driven 3-2-1 countdown per room

The design intentionally omits Redis Pub/Sub because Railway runs a single worker
by default.  If multi-worker support is ever needed, replace the in-memory
`self._connections` broadcast with a Redis pub/sub relay.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import random
import string
import time
from typing import Any, Dict, List, Optional

from fastapi import WebSocket

logger = logging.getLogger(__name__)

ROOM_TTL    = 7_200   # 2 hours  – room + players + scores live this long in Redis
TICKET_TTL  = 60      # 60 s     – WS auth ticket
MAX_PLAYERS = 8
CODE_CHARS  = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no 0 O 1 I (visually ambiguous)

# ---------------------------------------------------------------------------
# Lazy Redis helper
# ---------------------------------------------------------------------------

_redis_instance: Optional[Any] = None


async def _get_redis() -> Optional[Any]:
    """Return a singleton async Redis client, or None if Redis is unavailable."""
    global _redis_instance
    if _redis_instance is not None:
        return _redis_instance
    try:
        import redis.asyncio as aioredis  # type: ignore
        url = os.getenv("REDIS_URL", "redis://localhost:6379")
        _redis_instance = aioredis.from_url(url, encoding="utf-8", decode_responses=True)
        # Ping to verify connectivity
        await _redis_instance.ping()
        logger.info("[DUEL] Redis connected at %s", url)
    except Exception as e:
        logger.warning("[DUEL] Redis unavailable (%s) – duel rooms will not persist", e)
        _redis_instance = None
    return _redis_instance


# ---------------------------------------------------------------------------
# DuelManager
# ---------------------------------------------------------------------------

class DuelManager:
    """Central hub for duel room state and WebSocket connections."""

    def __init__(self) -> None:
        # code → {user_id → WebSocket}
        self._connections: Dict[str, Dict[int, WebSocket]] = {}
        # code → countdown asyncio.Task
        self._countdown_tasks: Dict[str, asyncio.Task] = {}   # type: ignore[type-arg]
        # In-memory fallback for local single-worker mode when Redis is unavailable.
        self._rooms: Dict[str, Dict[str, Any]] = {}
        self._tickets: Dict[str, Dict[str, Any]] = {}

    def _copy_room(self, room: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "code": room["code"],
            "state": room["state"],
            "host_id": room["host_id"],
            "seed": room["seed"],
            "config": json.loads(json.dumps(room["config"])),
            "start_ts": room["start_ts"],
            "players": json.loads(json.dumps(room["players"])),
            "scores": json.loads(json.dumps(room["scores"])),
        }

    def _get_local_room(self, code: str) -> Optional[Dict[str, Any]]:
        room = self._rooms.get(code)
        if not room:
            return None
        if room["created_at"] + ROOM_TTL < time.time():
            self._rooms.pop(code, None)
            self._connections.pop(code, None)
            self.cancel_countdown(code)
            return None
        return room

    def _get_local_ticket(self, ticket: str) -> Optional[Dict[str, Any]]:
        payload = self._tickets.get(ticket)
        if not payload:
            return None
        if payload["expires_at"] < time.time():
            self._tickets.pop(ticket, None)
            return None
        return payload

    # ── Key helpers ─────────────────────────────────────────────────────────

    @staticmethod
    def _rk(code: str) -> str:   return f"duel:room:{code}"

    @staticmethod
    def _pk(code: str) -> str:   return f"duel:players:{code}"

    @staticmethod
    def _sk(code: str) -> str:   return f"duel:scores:{code}"

    @staticmethod
    def _tk(ticket: str) -> str: return f"duel:ticket:{ticket}"

    # ── Code generation ──────────────────────────────────────────────────────

    async def generate_code(self) -> str:
        redis = await _get_redis()
        for _ in range(20):
            code = "".join(random.choices(CODE_CHARS, k=6))
            if redis is not None:
                if not await redis.exists(self._rk(code)):
                    return code
            elif not self._get_local_room(code):
                return code
        raise RuntimeError("Could not generate a unique room code after 20 tries")

    # ── Room CRUD ────────────────────────────────────────────────────────────

    async def create_room(self, host_id: int, host_name: str, config: dict) -> dict:
        redis = await _get_redis()
        code  = await self.generate_code()
        seed  = random.randint(1, 2 ** 30)
        now   = time.time()

        room_hash = {
            "code":       code,
            "state":      "lobby",
            "host_id":    str(host_id),
            "seed":       str(seed),
            "config":     json.dumps(config),
            "start_ts":   "",
            "created_at": str(now),
        }

        host_player = {
            "id":          host_id,
            "name":        host_name,
            "joined_at":   now,
            "is_ready":    True,
            "is_finished": False,
        }

        room = {
            "code":     code,
            "state":    "lobby",
            "host_id":  host_id,
            "seed":     seed,
            "config":   config,
            "start_ts": None,
            "players":  [host_player],
            "scores":   {},
            "created_at": now,
        }

        if redis:
            pipe = redis.pipeline()
            pipe.hset(self._rk(code), mapping=room_hash)
            pipe.expire(self._rk(code), ROOM_TTL)
            pipe.set(self._pk(code), json.dumps([host_player]), ex=ROOM_TTL)
            await pipe.execute()
        else:
            self._rooms[code] = room

        return self._copy_room(room)

    async def get_room(self, code: str) -> Optional[dict]:
        redis = await _get_redis()
        if not redis:
            room = self._get_local_room(code)
            return self._copy_room(room) if room else None

        raw = await redis.hgetall(self._rk(code))
        if not raw:
            return None

        players_raw  = await redis.get(self._pk(code))
        players: list = json.loads(players_raw) if players_raw else []

        scores_raw   = await redis.hgetall(self._sk(code))
        scores: dict = {int(k): json.loads(v) for k, v in scores_raw.items()}

        return {
            "code":     code,
            "state":    raw.get("state", "lobby"),
            "host_id":  int(raw.get("host_id", 0)),
            "seed":     int(raw.get("seed", 0)),
            "config":   json.loads(raw.get("config", "{}")),
            "start_ts": float(raw["start_ts"]) if raw.get("start_ts") else None,
            "players":  players,
            "scores":   scores,
        }

    async def join_room(self, code: str, user_id: int, user_name: str) -> list:
        redis = await _get_redis()
        if not redis:
            room = self._get_local_room(code)
            if not room:
                raise ValueError("ROOM_NOT_FOUND")
            players = room["players"]
            if any(p["id"] == user_id for p in players):
                return json.loads(json.dumps(players))
            if len(players) >= MAX_PLAYERS:
                raise ValueError("ROOM_FULL")
            players.append({
                "id":          user_id,
                "name":        user_name,
                "joined_at":   time.time(),
                "is_ready":    True,
                "is_finished": False,
            })
            return json.loads(json.dumps(players))

        players_raw = await redis.get(self._pk(code))
        players: list = json.loads(players_raw) if players_raw else []

        if any(p["id"] == user_id for p in players):
            return players                       # already in room – idempotent

        if len(players) >= MAX_PLAYERS:
            raise ValueError("ROOM_FULL")

        players.append({
            "id":          user_id,
            "name":        user_name,
            "joined_at":   time.time(),
            "is_ready":    True,
            "is_finished": False,
        })
        await redis.set(self._pk(code), json.dumps(players), ex=ROOM_TTL)
        return players

    async def update_state(self, code: str, state: str, extra: Optional[dict] = None) -> None:
        redis = await _get_redis()
        if not redis:
            room = self._get_local_room(code)
            if room:
                room["state"] = state
                if extra:
                    room.update(extra)
            return
        updates: dict = {"state": state}
        if extra:
            updates.update({k: str(v) for k, v in extra.items()})
        await redis.hset(self._rk(code), mapping=updates)

    async def update_score(
        self,
        code:     str,
        user_id:  int,
        correct:  int,
        wrong:    int,
        points:   int,
        finished: bool = False,
    ) -> None:
        redis = await _get_redis()
        if not redis:
            room = self._get_local_room(code)
            if room:
                room["scores"][user_id] = {
                    "correct": correct,
                    "wrong": wrong,
                    "points": points,
                    "finished": finished,
                }
            return
        score = {"correct": correct, "wrong": wrong, "points": points, "finished": finished}
        await redis.hset(self._sk(code), str(user_id), json.dumps(score))
        await redis.expire(self._sk(code), ROOM_TTL)

    async def mark_player_finished(self, code: str, user_id: int) -> None:
        redis = await _get_redis()
        if not redis:
            room = self._get_local_room(code)
            if room:
                for p in room["players"]:
                    if p["id"] == user_id:
                        p["is_finished"] = True
            return
        players_raw = await redis.get(self._pk(code))
        players: list = json.loads(players_raw) if players_raw else []
        for p in players:
            if p["id"] == user_id:
                p["is_finished"] = True
        await redis.set(self._pk(code), json.dumps(players), ex=ROOM_TTL)

    async def remove_player(self, code: str, user_id: int) -> tuple:
        """Remove player from room.  Returns (updated_players, new_host_id_or_None)."""
        redis = await _get_redis()
        if not redis:
            room = self._get_local_room(code)
            if not room:
                return [], None
            room["players"] = [p for p in room["players"] if p["id"] != user_id]
            new_host: Optional[int] = None
            if room["host_id"] == user_id and room["players"]:
                new_host = room["players"][0]["id"]
                room["host_id"] = new_host
            return json.loads(json.dumps(room["players"])), new_host

        players_raw = await redis.get(self._pk(code))
        players: list = json.loads(players_raw) if players_raw else []
        players = [p for p in players if p["id"] != user_id]

        raw      = await redis.hgetall(self._rk(code))
        old_host = int(raw.get("host_id", 0))

        new_host: Optional[int] = None
        if old_host == user_id and players:
            new_host = players[0]["id"]
            await redis.hset(self._rk(code), "host_id", str(new_host))

        if players:
            await redis.set(self._pk(code), json.dumps(players), ex=ROOM_TTL)
        else:
            # empty room – let TTL clean up the keys naturally
            pass

        return players, new_host

    # ── WS Ticket (single-use, 60-second lifetime) ───────────────────────────

    async def create_ws_ticket(self, user_id: int, user_name: str) -> str:
        redis = await _get_redis()
        ticket  = "".join(random.choices(string.ascii_letters + string.digits, k=32))
        payload = json.dumps({"user_id": user_id, "user_name": user_name})
        if redis:
            await redis.set(self._tk(ticket), payload, ex=TICKET_TTL)
        else:
            self._tickets[ticket] = {
                "user_id": user_id,
                "user_name": user_name,
                "expires_at": time.time() + TICKET_TTL,
            }
        return ticket

    async def consume_ws_ticket(self, ticket: str) -> Optional[dict]:
        """Look up ticket, delete it atomically (single-use), return identity."""
        redis = await _get_redis()
        if not redis:
            payload = self._get_local_ticket(ticket)
            if payload:
                self._tickets.pop(ticket, None)
                return {"user_id": payload["user_id"], "user_name": payload["user_name"]}
            return None
        key     = self._tk(ticket)
        payload = await redis.get(key)
        if payload:
            await redis.delete(key)
            return json.loads(payload)
        return None

    # ── WebSocket connection registry ────────────────────────────────────────

    async def ws_connect(self, code: str, user_id: int, ws: WebSocket) -> None:
        if code not in self._connections:
            self._connections[code] = {}
        self._connections[code][user_id] = ws

    async def ws_disconnect(self, code: str, user_id: int) -> None:
        room_conns = self._connections.get(code)
        if room_conns:
            room_conns.pop(user_id, None)
            if not room_conns:
                self._connections.pop(code, None)

    def get_connected_ids(self, code: str) -> List[int]:
        return list(self._connections.get(code, {}).keys())

    async def broadcast(self, code: str, message: dict, exclude: Optional[int] = None) -> None:
        """Send message to all connected clients in a room."""
        payload  = json.dumps(message)
        dead: List[int] = []
        for uid, ws in list(self._connections.get(code, {}).items()):
            if uid == exclude:
                continue
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(uid)
        for uid in dead:
            await self.ws_disconnect(code, uid)

    async def send_to(self, code: str, user_id: int, message: dict) -> None:
        """Send message to a specific connected client."""
        ws = self._connections.get(code, {}).get(user_id)
        if ws:
            try:
                await ws.send_text(json.dumps(message))
            except Exception:
                await self.ws_disconnect(code, user_id)

    # ── Countdown (server-driven 3-2-1 → GAME_START) ────────────────────────

    def cancel_countdown(self, code: str) -> None:
        task = self._countdown_tasks.pop(code, None)
        if task and not task.done():
            task.cancel()

    async def _run_countdown(self, code: str, seed: int) -> None:
        try:
            await self.update_state(code, "countdown")
            for n in (3, 2, 1):
                await self.broadcast(code, {"type": "COUNTDOWN", "payload": {"n": n}})
                await asyncio.sleep(1.0)

            start_ts = time.time()
            await self.update_state(code, "playing", {"start_ts": start_ts})
            await self.broadcast(code, {
                "type":    "GAME_START",
                "payload": {
                    "seed":           seed,
                    "startTimestamp": int(start_ts * 1000),
                },
            })
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.exception("[DUEL] Countdown error in room %s: %s", code, e)
        finally:
            self._countdown_tasks.pop(code, None)

    def start_countdown(self, code: str, seed: int) -> None:
        self.cancel_countdown(code)
        task = asyncio.create_task(self._run_countdown(code, seed))
        self._countdown_tasks[code] = task


# Module-level singleton used by duel_routes.py
duel_manager = DuelManager()
