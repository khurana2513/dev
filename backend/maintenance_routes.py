"""Maintenance mode routes — in-memory state, no DB dependency."""
import os
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from auth import get_current_user
from models import User

router = APIRouter()

# ---------------------------------------------------------------------------
# In-memory state (survives only for this process lifetime).
# Set MAINTENANCE_MODE=true env-var to start the server in maintenance mode.
# ---------------------------------------------------------------------------
_state: dict = {
    "enabled": os.environ.get("MAINTENANCE_MODE", "false").lower() == "true",
    "message": os.environ.get(
        "MAINTENANCE_MESSAGE",
        "We're making some improvements to Talent Hub. We'll be back shortly!",
    ),
}


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class MaintenanceStatus(BaseModel):
    enabled: bool
    message: str


class MaintenanceMessageUpdate(BaseModel):
    message: str


# ---------------------------------------------------------------------------
# Public endpoint — no auth required
# ---------------------------------------------------------------------------
@router.get("/public/maintenance-status", response_model=MaintenanceStatus, tags=["Maintenance"])
async def get_maintenance_status() -> MaintenanceStatus:
    """Return current maintenance mode status (public, no auth)."""
    return MaintenanceStatus(**_state)


# ---------------------------------------------------------------------------
# Admin endpoints — require admin role
# ---------------------------------------------------------------------------
def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    return current_user


@router.post("/admin/maintenance/toggle", response_model=MaintenanceStatus, tags=["Maintenance"])
async def toggle_maintenance(admin: User = Depends(_require_admin)) -> MaintenanceStatus:
    """Toggle maintenance mode on or off."""
    _state["enabled"] = not _state["enabled"]
    return MaintenanceStatus(**_state)


@router.post("/admin/maintenance/enable", response_model=MaintenanceStatus, tags=["Maintenance"])
async def enable_maintenance(admin: User = Depends(_require_admin)) -> MaintenanceStatus:
    """Enable maintenance mode."""
    _state["enabled"] = True
    return MaintenanceStatus(**_state)


@router.post("/admin/maintenance/disable", response_model=MaintenanceStatus, tags=["Maintenance"])
async def disable_maintenance(admin: User = Depends(_require_admin)) -> MaintenanceStatus:
    """Disable maintenance mode."""
    _state["enabled"] = False
    return MaintenanceStatus(**_state)


@router.put("/admin/maintenance/message", response_model=MaintenanceStatus, tags=["Maintenance"])
async def set_maintenance_message(
    payload: MaintenanceMessageUpdate,
    admin: User = Depends(_require_admin),
) -> MaintenanceStatus:
    """Update the maintenance message."""
    _state["message"] = payload.message.strip() or _state["message"]
    return MaintenanceStatus(**_state)
