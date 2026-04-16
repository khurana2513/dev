"""
report_routes.py — Issue reporting endpoint.
Accepts a description and optional screenshots, forwards them to the admin email.
Uses Python stdlib smtplib (no extra packages needed).
"""
from __future__ import annotations

import logging
import os
import smtplib
import base64
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from typing import List, Optional

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile, status
from fastapi.concurrency import run_in_threadpool

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["report"])

# ── Constants ──────────────────────────────────────────────────────────────────
MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024       # 5 MB per image
MAX_IMAGES           = 5                      # up to 5 screenshots
ALLOWED_MIME_PREFIXES = ("image/",)           # any image/* format
RECIPIENT_EMAIL      = "ayushkhurana47@gmail.com"

# Rate limiting: simple in-memory counter (good enough for low volume)
from collections import defaultdict
import time as _time

_rate_limit_store: dict[str, list[float]] = defaultdict(list)
RATE_WINDOW_SECONDS = 3600   # 1 hour window
RATE_LIMIT_COUNT    = 5      # max 5 reports per IP per hour


def _is_rate_limited(ip: str) -> bool:
    now = _time.time()
    cutoff = now - RATE_WINDOW_SECONDS
    _rate_limit_store[ip] = [t for t in _rate_limit_store[ip] if t > cutoff]
    if len(_rate_limit_store[ip]) >= RATE_LIMIT_COUNT:
        return True
    _rate_limit_store[ip].append(now)
    return False


def _send_email_sync(
    description: str,
    reporter_info: str,
    attachments: list[tuple[str, bytes, str]],  # (filename, data, content_type)
) -> None:
    """Blocking SMTP send — call via run_in_threadpool."""
    smtp_email    = os.getenv("SMTP_EMAIL", "")
    smtp_password = os.getenv("SMTP_APP_PASSWORD", "")

    if not smtp_email or not smtp_password:
        # Log prominently so dev can see it, but don't crash the endpoint
        logger.warning(
            "SMTP_EMAIL or SMTP_APP_PASSWORD not set — skipping email send. "
            "Issue report was received: %.200s", description
        )
        return

    msg = MIMEMultipart("mixed")
    msg["From"]    = smtp_email
    msg["To"]      = RECIPIENT_EMAIL
    msg["Subject"] = f"[BlackMonkey] Issue Report — {datetime.utcnow().strftime('%Y-%m-%d %H:%M')} UTC"

    body_html = f"""
<html>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:28px;border:1px solid #e0e0e0">
    <h2 style="color:#7c3aed;margin:0 0 6px">🐛 Issue Report</h2>
    <p style="color:#888;font-size:13px;margin:0 0 20px">{datetime.utcnow().strftime('%d %B %Y, %H:%M')} UTC</p>
    <hr style="border:none;border-top:1px solid #eee;margin:0 0 20px">

    <h3 style="color:#333;font-size:14px;margin:0 0 8px;text-transform:uppercase;letter-spacing:.06em">Reporter Info</h3>
    <p style="background:#f9f9f9;border-radius:8px;padding:12px;font-size:14px;color:#555;margin:0 0 20px;white-space:pre-wrap">{reporter_info or 'Anonymous / not signed in'}</p>

    <h3 style="color:#333;font-size:14px;margin:0 0 8px;text-transform:uppercase;letter-spacing:.06em">Description</h3>
    <p style="background:#f9f9f9;border-radius:8px;padding:14px;font-size:15px;color:#333;margin:0;white-space:pre-wrap;line-height:1.6">{description}</p>

    {'<p style="margin:16px 0 0;color:#888;font-size:12px">' + str(len(attachments)) + ' screenshot(s) attached.</p>' if attachments else ''}
  </div>
</body>
</html>
"""

    msg.attach(MIMEText(body_html, "html"))

    for filename, data, content_type in attachments:
        part = MIMEBase(*content_type.split("/", 1))
        part.set_payload(data)
        encoders.encode_base64(part)
        part.add_header("Content-Disposition", f'attachment; filename="{filename}"')
        msg.attach(part)

    with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=20) as server:
        server.login(smtp_email, smtp_password)
        server.sendmail(smtp_email, RECIPIENT_EMAIL, msg.as_string())

    logger.info("Issue report email sent to %s", RECIPIENT_EMAIL)


@router.post("/report-issue", status_code=status.HTTP_200_OK)
async def report_issue(
    request: Request,
    description: str = Form(..., min_length=10, max_length=4000),
    reporter_name: Optional[str] = Form(default=None),
    reporter_email: Optional[str] = Form(default=None),
    screenshots: List[UploadFile] = File(default=[]),
):
    """
    Accept an issue report with optional screenshots and email it to the admin.
    Rate-limited to 5 reports per IP per hour.
    """
    # ── Rate limit ──────────────────────────────────────────────────────────────
    ip = request.client.host if request.client else "unknown"
    if _is_rate_limited(ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many reports. Please wait a while before submitting again.",
        )

    # ── Validate screenshots ───────────────────────────────────────────────────
    if len(screenshots) > MAX_IMAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum {MAX_IMAGES} screenshots allowed.",
        )

    attachments: list[tuple[str, bytes, str]] = []
    for idx, file in enumerate(screenshots):
        # Must be an image
        content_type = file.content_type or ""
        if not any(content_type.startswith(p) for p in ALLOWED_MIME_PREFIXES):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File #{idx + 1} is not an image. Only image files are accepted.",
            )
        # Read and check size
        data = await file.read()
        if len(data) > MAX_IMAGE_SIZE_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File #{idx + 1} exceeds the 5 MB size limit.",
            )
        filename = file.filename or f"screenshot_{idx + 1}.png"
        attachments.append((filename, data, content_type))

    # ── Build reporter info string ──────────────────────────────────────────────
    parts = []
    if reporter_name:
        parts.append(f"Name:  {reporter_name.strip()}")
    if reporter_email:
        parts.append(f"Email: {reporter_email.strip()}")
    parts.append(f"IP:    {ip}")
    reporter_info = "\n".join(parts)

    # ── Send email in thread pool (non-blocking) ────────────────────────────────
    try:
        await run_in_threadpool(
            _send_email_sync,
            description.strip(),
            reporter_info,
            attachments,
        )
    except Exception as exc:
        logger.error("Failed to send issue-report email: %s", exc, exc_info=True)
        # Don't expose SMTP internals to the caller
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not send your report. Please try again or contact the developer directly.",
        )

    return {"ok": True, "message": "Report received. Thank you!"}
