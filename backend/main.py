"""FastAPI main application."""
from fastapi import FastAPI, Depends, HTTPException, status, Request, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Callable, Awaitable, Dict, Any, Optional
from datetime import datetime, timezone
from timezone_utils import get_ist_now, get_utc_now, IST_TIMEZONE, utc_to_ist
import json
import hashlib
import random
import time
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from models import Paper, PaperAttempt, get_db, init_db, PointsLog, VacantId  # Import models to register them with Base.metadata
from schemas import (
    PaperCreate, PaperResponse, PaperConfig, PreviewResponse,
    GeneratedBlock, BlockConfig
)
from user_schemas import PaperAttemptCreate, PaperAttemptResponse, PaperAttemptDetailResponse, PaperAttemptSubmit
from auth import get_current_user
from models import User
from gamification import calculate_points
from math_generator import generate_block
from pdf_generator_playwright import generate_pdf_playwright
from presets import get_preset_blocks
from exceptions import ErrorHandler, DatabaseError, ExternalServiceError
from config import get_config

APP_CONFIG = get_config()

LOG_FORMAT = "%(levelname)s %(name)s %(message)s"
logging.basicConfig(level=APP_CONFIG.log_level, format=LOG_FORMAT)
logger = logging.getLogger(__name__)
error_handler = ErrorHandler()

# Lazy import of user_routes to prevent startup failures
user_router = None
try:
    from user_routes import router as user_router
    logger.info("[IMPORT] user_routes loaded")
except Exception as e:
    import traceback
    logger.exception("[IMPORT] user_routes failed: %s", str(e))
    logger.debug(traceback.format_exc())
    # Continue without user routes - other endpoints will still work

attendance_router = None
try:
    from attendance_routes import router as attendance_router
    logger.info("[IMPORT] attendance_routes loaded")
except Exception as e:
    import traceback
    logger.exception("[IMPORT] attendance_routes failed: %s", str(e))
    logger.debug(traceback.format_exc())

app = FastAPI(title="Abacus Paper Generator", version="3.0.0")
app_start_time = time.monotonic()

# ✓ Thread pool for non-blocking PDF generation (prevents event loop blocking)
# Allows async event loop to process other requests while PDF is being generated in thread
_pdf_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="pdf-gen")

# Timeout for incomplete paper attempts (1 hour)
INCOMPLETE_ATTEMPT_TIMEOUT_SECONDS = 3600  # 1 hour

# Security: CORS configuration from environment with fallback for development
# Set ALLOWED_ORIGINS env var with comma-separated list of allowed origins
ALLOWED_ORIGINS = APP_CONFIG.allowed_origins
if ALLOWED_ORIGINS:
    logger.info("[SECURITY] CORS origins configured: %s", len(ALLOWED_ORIGINS))
else:
    logger.warning("[SECURITY] No CORS origins configured (ALLOWED_ORIGINS empty)")


app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Security: Rate limiting to prevent abuse and DDoS attacks
# Configure rate limits based on environment
limiter = Limiter(key_func=get_remote_address, default_limits=[APP_CONFIG.rate_limit_default])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
logger.info("[SECURITY] Rate limiting enabled: %s", APP_CONFIG.rate_limit_default)

# Add request timing middleware
@app.middleware("http")
async def timing_middleware(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
    """Log request timing for diagnostics."""
    start_time = time.time()
    response = await call_next(request)
    elapsed = time.time() - start_time
    # Only log slow requests (>1s) or important endpoints
    if elapsed > 1.0 or request.url.path in ["/users/stats", "/users/me", "/papers/attempt"]:
        logger.info("[TIMING] method=%s path=%s duration_s=%.2f", request.method, request.url.path, elapsed)
    return response

# Add response headers middleware for COOP and security
@app.middleware("http")
async def add_security_headers(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
    """Add security headers including COOP for Google OAuth compatibility."""
    response = await call_next(request)
    
    # Cross-Origin-Opener-Policy: Allow Google OAuth to use postMessage
    # Using "unsafe-none" allows cross-origin window communication needed for OAuth
    response.headers["Cross-Origin-Opener-Policy"] = "unsafe-none"
    
    # Cross-Origin-Embedder-Policy: Not needed for OAuth, but set to allow embedding
    response.headers["Cross-Origin-Embedder-Policy"] = "unsafe-none"
    
    # Additional security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    
    return response

# Define health endpoint FIRST (before router inclusion)
# This ensures health check works even if other routes fail
@app.get("/health")
async def health_check() -> Dict[str, Any]:
    """Health check endpoint - should never fail."""
    try:
        # Check database connection and latency
        db_start = time.perf_counter()
        db = next(get_db())
        db.execute(text("SELECT 1"))
        db.close()
        db_latency_ms = round((time.perf_counter() - db_start) * 1000, 2)
        return {
            "status": "ok", 
            "message": "Server is running",
            "database": "connected",
            "db_latency_ms": db_latency_ms,
            "uptime_seconds": round(time.monotonic() - app_start_time, 2),
            "env": APP_CONFIG.env,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "version": app.version,
        }
    except Exception as e:
        return {
            "status": "degraded",
            "message": "Server is running but database connection failed",
            "database": "disconnected",
            "error": str(e)[:100],
            "uptime_seconds": round(time.monotonic() - app_start_time, 2),
            "env": APP_CONFIG.env,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "version": app.version,
        }

@app.get("/")
async def root() -> Dict[str, str]:
    """Root endpoint."""
    return {"message": "Abacus Paper Generator API", "version": "2.0.0"}

# Include routers - only if import succeeded
if user_router:
    try:
        app.include_router(user_router)
        logger.info("[STARTUP] user_router included")
    except Exception as e:
        import traceback
        logger.exception("[STARTUP] user_router include failed: %s", str(e))
        logger.debug(traceback.format_exc())
else:
    logger.warning("[STARTUP] user_router not available")

if attendance_router:
    try:
        app.include_router(attendance_router)
        logger.info("[STARTUP] attendance_router included")
    except Exception as e:
        import traceback
        logger.exception("[STARTUP] attendance_router include failed: %s", str(e))
        logger.debug(traceback.format_exc())
else:
    logger.warning("[STARTUP] attendance_router not available")

# Initialize database on startup
@app.on_event("startup")
async def startup_event() -> None:
    try:
        logger.info("[STARTUP] initializing database")
        init_db()
        logger.info("[STARTUP] database initialized")
        
        # Clean up stale incomplete attempts on startup
        try:
            db = next(get_db())
            cleaned_count = cleanup_stale_incomplete_attempts(db)
            if cleaned_count > 0:
                logger.info("[STARTUP] cleaned stale attempts: %s", cleaned_count)
            db.close()
        except Exception as cleanup_error:
            logger.warning("[STARTUP] cleanup stale attempts failed: %s", cleanup_error)
            # Don't fail startup if cleanup fails
    except Exception as e:
        import traceback
        logger.exception("[STARTUP] database initialization failed: %s", str(e))
        logger.debug(traceback.format_exc())
        # Don't crash the app, but log the error


# Handle validation errors (specific handler - must come before global handler)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    # Log the validation error details for debugging
    error_details = exc.errors()
    logger.warning("[VALIDATION] method=%s path=%s", request.method, request.url.path)
    logger.warning("[VALIDATION] errors=%s", error_details)
    
    # Try to log the request body if available
    try:
        body = await request.body()
        if body:
            body_str = body.decode('utf-8')[:500]  # Limit to first 500 chars
            logger.warning("[VALIDATION] body=%s", body_str)
        else:
            logger.warning("[VALIDATION] body=empty")
    except Exception as e:
        logger.warning("[VALIDATION] body_read_failed=%s", str(e))
    
    # Log headers that might affect parsing
    content_type = request.headers.get("content-type", "not set")
    logger.warning("[VALIDATION] content_type=%s", content_type)
    
    return JSONResponse(
        status_code=422,
        content={
            "detail": error_details,
            "message": "Validation error: Please check your request format. Ensure 'credential' or 'token' field is provided with a valid Google OAuth token."
        }
    )

# Global exception handler - ensures ALL errors return JSON (must come last)
# This prevents hard socket drops and ERR_EMPTY_RESPONSE errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Global exception handler to ensure all errors return JSON and prevent socket drops."""
    import traceback
    
    # Handle HTTPException (already properly formatted by FastAPI)
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "detail": exc.detail if isinstance(exc.detail, str) else str(exc.detail),
                "message": exc.detail if isinstance(exc.detail, str) else "An error occurred"
            }
        )
    
    # Handle validation errors (shouldn't reach here, but just in case)
    if isinstance(exc, RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={
                "detail": exc.errors(),
                "message": "Validation error: Please check your request format"
            }
        )
    
    # Handle all other exceptions
    error_msg = str(exc) if exc else "Internal server error"
    traceback_str = traceback.format_exc()
    
    # Enhanced error logging to help diagnose issues
    logger.exception("[GLOBAL_ERROR] path=%s method=%s error=%s", request.url.path, request.method, exc)
    logger.debug(traceback_str)
    
    # Return JSON error response - this prevents socket drops
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "message": "An internal server error occurred"
        }
    )


@app.get("/papers", response_model=List[PaperResponse])
async def list_papers(db: Session = Depends(get_db)):
    """Get all papers."""
    papers = db.query(Paper).order_by(Paper.created_at.desc()).all()
    return papers


# IMPORTANT: This route must come BEFORE /papers/{paper_id} to avoid route conflicts
def cleanup_stale_incomplete_attempts(db: Session, user_id: Optional[int] = None) -> int:
    """Clean up incomplete attempts that are older than the timeout."""
    try:
        utc_now = get_utc_now()
        timeout_threshold = utc_now - timedelta(seconds=INCOMPLETE_ATTEMPT_TIMEOUT_SECONDS)
        
        query = db.query(PaperAttempt).filter(
            PaperAttempt.completed_at.is_(None),  # Only incomplete attempts
            PaperAttempt.started_at < timeout_threshold.replace(tzinfo=None)  # Older than timeout (UTC)
        )
        
        if user_id:
            query = query.filter(PaperAttempt.user_id == user_id)
        
        stale_attempts = query.all()
        
        if stale_attempts:
            logger.info("[CLEANUP] stale_attempts=%s", len(stale_attempts))
            for attempt in stale_attempts:
                # Mark as completed with zero score (abandoned)
                attempt.completed_at = utc_now.replace(tzinfo=None)
                attempt.correct_answers = 0
                attempt.wrong_answers = 0
                attempt.accuracy = 0.0
                attempt.score = 0
                attempt.points_earned = 0
                logger.debug("[CLEANUP] marked_attempt=%s", attempt.id)
            
            db.commit()
            logger.info("[CLEANUP] cleaned=%s", len(stale_attempts))
        
        return len(stale_attempts)
    except Exception as e:
        logger.exception("[CLEANUP] error=%s", e)
        import traceback
        logger.debug(traceback.format_exc())
        db.rollback()
        return 0


@app.get("/papers/attempts", response_model=List[PaperAttemptResponse])
async def get_paper_attempts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = Query(10, ge=1, le=100)
):
    """Get user's paper attempt history. Only latest 10 attempts are stored."""
    try:
        # Clean up stale incomplete attempts for this user
        cleanup_stale_incomplete_attempts(db, user_id=current_user.id)
        
        attempts = db.query(PaperAttempt).filter(
            PaperAttempt.user_id == current_user.id
        ).order_by(PaperAttempt.started_at.desc()).limit(limit).all()
        
        logger.info("[PAPER_ATTEMPTS] user_id=%s count=%s", current_user.id, len(attempts))
        
        # Validate and convert each attempt
        result = []
        for attempt in attempts:
            try:
                validated = PaperAttemptResponse.model_validate(attempt)
                result.append(validated)
            except Exception as e:
                logger.exception("[PAPER_ATTEMPTS] validation_failed attempt_id=%s error=%s", attempt.id, e)
                # Skip invalid attempts but continue processing others
                continue
        
        logger.info("[PAPER_ATTEMPTS] validated_count=%s", len(result))
        return result
    except Exception as e:
        logger.exception("[PAPER_ATTEMPTS] error=%s", e)
        raise HTTPException(status_code=500, detail=f"Failed to get paper attempts: {str(e)}")


@app.get("/papers/{paper_id}", response_model=PaperResponse)
async def get_paper(paper_id: int, db: Session = Depends(get_db)):
    """Get a single paper by ID."""
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    return paper


@app.post("/papers", response_model=PaperResponse, status_code=status.HTTP_201_CREATED)
async def create_paper(paper_data: PaperCreate, db: Session = Depends(get_db)):
    """Create a new paper."""
    # If using preset level, ensure blocks are populated
    config = paper_data.config
    if paper_data.level != "Custom" and (not config.blocks or len(config.blocks) == 0):
        config.blocks = get_preset_blocks(paper_data.level)
    
    paper = Paper(
        title=paper_data.title,
        level=paper_data.level,
        config=config.model_dump()
    )
    db.add(paper)
    db.commit()
    db.refresh(paper)
    return paper


@app.get("/presets/{level}")
async def get_preset_blocks(level: str):
    """Get preset blocks for a given level."""
    try:
        from presets import get_preset_blocks
        blocks = get_preset_blocks(level)
        # Convert BlockConfig to dict for JSON serialization
        return [block.model_dump() for block in blocks]
    except Exception as e:
        import traceback
        error_msg = f"Failed to get preset blocks for {level}: {str(e)}"
        logger.exception("[PRESETS] %s", error_msg)
        logger.debug(traceback.format_exc())
        raise HTTPException(status_code=500, detail=error_msg)


def get_level_display_name(level: str) -> str:
    """Convert level code to display name."""
    if level == "Custom":
        return ""
    if level.startswith("AB-"):
        try:
            level_num = int(level.split("-")[1])
            if 1 <= level_num <= 6:
                return f"Basic Level {level_num}"
            elif 7 <= level_num <= 10:
                return f"Advanced Level {level_num}"
        except (ValueError, IndexError):
            pass
    # Fallback: return level as-is if format is unexpected
    return level


@app.post("/papers/preview", response_model=PreviewResponse)
async def preview_paper(config: PaperConfig):
    """Generate preview of questions."""
    try:
        logger.info("[PREVIEW] level=%s title=%s blocks=%s", config.level, config.title, len(config.blocks))

        # Resolve blocks (Preset vs Custom)
        blocks = config.blocks
        if config.level != "Custom" and (not blocks or len(blocks) == 0):
            blocks = get_preset_blocks(config.level)
        
        # Update title to include level name if using presets (for preview display)
        if config.level != "Custom":
            level_display_name = get_level_display_name(config.level)
            if level_display_name and level_display_name not in config.title:
                config.title = f"{config.title} - {level_display_name}"

        if not blocks or len(blocks) == 0:
            raise HTTPException(status_code=400, detail="At least one question block is required")

        logger.info("[PREVIEW] resolved_blocks=%s", len(blocks))
        for i, block in enumerate(blocks):
            logger.debug(
                "[PREVIEW] block_index=%s id=%s type=%s count=%s constraints=%s",
                i,
                block.id,
                block.type,
                block.count,
                block.constraints,
            )

        # Generate a random seed for preview to ensure different questions each time
        # The seed will be returned and can be used for PDF generation to get the same questions
        # Use timestamp + random to ensure uniqueness
        seed = int((time.time() * 1000) % (2**31)) + random.randint(1, 1000000)
        seed = seed % (2**31)  # Keep it within int32 range

        logger.debug("[PREVIEW] seed=%s", seed)

        question_id_counter = 1
        generated_blocks = []

        for block in blocks:
            try:
                logger.debug("[PREVIEW] generating block_id=%s type=%s count=%s", block.id, block.type, block.count)
                gen_block = generate_block(block, question_id_counter, seed)
                logger.debug("[PREVIEW] generated block_id=%s questions=%s", block.id, len(gen_block.questions))
                generated_blocks.append(gen_block)
                question_id_counter += block.count
            except Exception as e:
                import traceback
                error_detail = f"Failed to generate block '{block.id}': {str(e)}"
                logger.exception("[PREVIEW] %s", error_detail)
                logger.debug(traceback.format_exc())
                raise HTTPException(
                    status_code=500,
                    detail=error_detail
                )

        logger.info("[PREVIEW] generated_blocks=%s", len(generated_blocks))
        return PreviewResponse(blocks=generated_blocks, seed=seed)
    except HTTPException:
        raise
    except ValueError as e:
        # Pydantic validation errors
        error_msg = f"Validation error: {str(e)}"
        logger.warning("[PREVIEW] validation_error=%s", error_msg)
        raise HTTPException(
            status_code=422,
            detail=error_msg
        )
    except Exception as e:
        import traceback
        error_msg = str(e)
        traceback_str = traceback.format_exc()
        logger.error("[PREVIEW] error=%s", error_msg)
        logger.debug(traceback_str)
        # Write to file for debugging
        with open("/tmp/preview_error.log", "w") as f:
            f.write(f"Error: {error_msg}\n{traceback_str}")
        raise HTTPException(
            status_code=500,
            detail=f"Preview generation error: {error_msg}"
        )


@app.post("/papers/generate-pdf")
async def generate_pdf_endpoint(
    request_data: dict
):
    """Generate PDF from config.
    
    ✓ Non-blocking: Uses thread pool to prevent event loop blocking
    ✓ Fast response: Returns PDF while maintaining other requests
    
    Parameters:
    - withAnswers: Include answers in questions
    - answersOnly: Generate only answer key
    - includeSeparateAnswerKey: Generate question paper + separate answer key page
    """
    config = PaperConfig(**request_data.get("config", {}))
    # Handle both camelCase and snake_case
    with_answers = request_data.get("with_answers") or request_data.get("withAnswers", False)
    answers_only = request_data.get("answers_only") or request_data.get("answersOnly", False)
    include_separate_answer_key = request_data.get("include_separate_answer_key") or request_data.get("includeSeparateAnswerKey", False)
    seed = request_data.get("seed")
    generated_blocks_data = request_data.get("generated_blocks")
    
    # Resolve blocks
    blocks = config.blocks
    if config.level != "Custom" and (not blocks or len(blocks) == 0):
        blocks = get_preset_blocks(config.level)
    
    # Update title to include level name if using presets
    if config.level != "Custom":
        level_display_name = get_level_display_name(config.level)
        if level_display_name and level_display_name not in config.title:
            config.title = f"{config.title} - {level_display_name}"
    
    # Use provided blocks or generate new ones
    if generated_blocks_data:
        final_blocks = [GeneratedBlock(**block) for block in generated_blocks_data]
    else:
        # Generate with seed
        if seed is None:
            config_json = json.dumps(config.model_dump(), sort_keys=True)
            config_hash = int(hashlib.md5(config_json.encode()).hexdigest(), 16)
            seed = abs(config_hash) % (2**31)
        
        question_id_counter = 1
        final_blocks = []
        for block in blocks:
            gen_block = generate_block(block, question_id_counter, seed)
            final_blocks.append(gen_block)
            question_id_counter += block.count
    
    # ✓ Non-blocking PDF generation using thread pool
    # Playwright PDF generation (5-10 seconds) runs in thread, not blocking event loop
    try:
        pdf_buffer = await _generate_pdf_buffer_async(
            config,
            final_blocks,
            with_answers,
            answers_only,
            include_separate_answer_key,
        )
        
        if answers_only:
            filename = f"{config.title.replace(' ', '_')}_answers_only.pdf"
        elif with_answers:
            filename = f"{config.title.replace(' ', '_')}_answer_key.pdf"
        elif include_separate_answer_key:
            filename = f"{config.title.replace(' ', '_')}_with_answer_key.pdf"
        else:
            filename = f"{config.title.replace(' ', '_')}.pdf"
        
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("[PDF] generation_failed error=%s", e)
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")


async def _generate_pdf_buffer_async(
    paper_config: PaperConfig,
    final_blocks: List[GeneratedBlock],
    with_answers: bool,
    answers_only: bool,
    include_separate_answer_key: bool,
):
    """Generate PDF using Playwright (headless Chromium).
    
    ✓ Non-blocking: Runs in thread pool to prevent event loop blocking
    ✓ Professional: Pixel-perfect output, matches preview exactly
    ✓ Scalable: Handles concurrent requests with thread pool executor
    """
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        _pdf_executor,
        lambda: _generate_pdf_sync(
            paper_config,
            final_blocks,
            with_answers,
            answers_only,
            include_separate_answer_key,
        ),
    )


def _generate_pdf_sync(paper_config, final_blocks, with_answers, answers_only, include_separate_answer_key):
    """Synchronous PDF generation using Playwright (runs in thread pool, non-blocking).
    
    This is the only PDF generator in the system - professional, scalable, and feature-complete.
    """
    try:
        import inspect
        if inspect.iscoroutinefunction(generate_pdf_playwright):
            import asyncio
            new_loop = asyncio.new_event_loop()
            asyncio.set_event_loop(new_loop)
            try:
                logger.info("[PDF] Generating with Playwright")
                pdf_buffer = new_loop.run_until_complete(
                    generate_pdf_playwright(
                        paper_config,
                        final_blocks,
                        with_answers,
                        answers_only,
                        include_separate_answer_key,
                    )
                )
                logger.info("[PDF] Generation successful")
                return pdf_buffer
            finally:
                new_loop.close()
        else:
            # Sync version (if playwright doesn't use async)
            logger.info("[PDF] Generating with Playwright (sync mode)")
            return generate_pdf_playwright(
                paper_config,
                final_blocks,
                with_answers,
                answers_only,
                include_separate_answer_key,
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("[PDF] Generation failed: %s", str(e))
        # Provide helpful error message with solution
        error_msg = str(e).lower()
        if "chromium" in error_msg or "browser" in error_msg:
            raise HTTPException(
                status_code=503,
                detail="PDF generation service temporarily unavailable. Chromium browser not found. System will recover automatically.",
            )
        elif "timeout" in error_msg:
            raise HTTPException(
                status_code=504,
                detail="PDF generation timed out. The paper may be too complex. Try reducing question count.",
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"PDF generation failed: {str(e)}",
            )


@app.post("/papers/{paper_id}/download")
async def download_paper_pdf(
    paper_id: int,
    with_answers: bool = False,
    db: Session = Depends(get_db)
):
    """Download PDF for a saved paper using Playwright.
    
    Parameters:
    - with_answers: Include answers in questions
    """
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    
    # Reconstruct config from stored data
    config = PaperConfig(**paper.config)
    
    # Generate questions (regenerate each time)
    config_json = json.dumps(paper.config, sort_keys=True)
    config_hash = int(hashlib.md5(config_json.encode()).hexdigest(), 16)
    seed = abs(config_hash) % (2**31)
    
    question_id_counter = 1
    generated_blocks = []
    for block_config_dict in config.blocks:
        block_config = BlockConfig(**block_config_dict)
        gen_block = generate_block(block_config, question_id_counter, seed)
        generated_blocks.append(gen_block)
        question_id_counter += block_config.count
    
    try:
        pdf_buffer = await _generate_pdf_buffer_async(
            config,
            generated_blocks,
            with_answers,
            False,
            False,
        )
        filename = f"{paper.title.replace(' ', '_')}{'_answers' if with_answers else ''}.pdf"

        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        logger.exception("[PDF] download_failed paper_id=%s error=%s", paper_id, e)
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")


@app.get("/papers/attempt/count")
async def get_paper_attempt_count(
    seed: int = Query(..., description="Paper seed"),
    paper_title: str = Query(..., description="Paper title"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the number of attempts for a specific paper. Returns count and whether re-attempt is allowed."""
    count = db.query(PaperAttempt).filter(
        PaperAttempt.user_id == current_user.id,
        PaperAttempt.seed == seed,
        PaperAttempt.paper_title == paper_title
    ).count()
    
    return {
        "count": count,
        "can_reattempt": count < 2,
        "max_attempts": 2
    }


@app.post("/papers/attempt", response_model=PaperAttemptResponse)
async def start_paper_attempt(
    attempt_data: PaperAttemptCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start a new paper attempt. Maximum 2 attempts per paper (1 fresh + 1 re-attempt)."""
    # Check how many attempts this user has for this paper (same seed = same paper)
    existing_attempts = db.query(PaperAttempt).filter(
        PaperAttempt.user_id == current_user.id,
        PaperAttempt.seed == attempt_data.seed,
        PaperAttempt.paper_title == attempt_data.paper_title
    ).count()
    
    if existing_attempts >= 2:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum attempts reached. You can only attempt this paper twice (1 fresh attempt + 1 re-attempt)."
        )
    
    # Calculate total questions
    total_questions = sum(len(block.get("questions", [])) for block in attempt_data.generated_blocks)
    
    # Create paper attempt
    paper_attempt = PaperAttempt(
        user_id=current_user.id,
        paper_title=attempt_data.paper_title,
        paper_level=attempt_data.paper_level,
        paper_config=attempt_data.paper_config,
        generated_blocks=attempt_data.generated_blocks,
        seed=attempt_data.seed,
        total_questions=total_questions,
        answers=attempt_data.answers or {}
    )
    db.add(paper_attempt)
    db.commit()
    db.refresh(paper_attempt)
    
    return PaperAttemptResponse.model_validate(paper_attempt)

@app.put("/papers/attempt/{attempt_id}", response_model=PaperAttemptResponse)
async def submit_paper_attempt(
    attempt_id: int,
    submit_data: PaperAttemptSubmit,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    answers = submit_data.answers
    time_taken = submit_data.time_taken
    """Submit answers for a paper attempt and calculate results."""
    request_start = time.time()
    try:
        paper_attempt = db.query(PaperAttempt).filter(
            PaperAttempt.id == attempt_id,
            PaperAttempt.user_id == current_user.id
        ).first()
        
        if not paper_attempt:
            raise HTTPException(status_code=404, detail="Paper attempt not found")
        
        logger.debug(
            "[SUBMIT] attempt_id=%s completed_at=%s user_id=%s",
            attempt_id,
            paper_attempt.completed_at,
            paper_attempt.user_id,
        )
        
        # Idempotency: if this attempt already completed, return it (don't award points twice).
        # The API client retries mutations (POST/PUT) on network errors — the backend may have
        # committed the first submission but the response never reached the client.  We return
        # the already-committed record for up to 90 s (longer than the 45 s MUTATION_TIMEOUT
        # plus any retry delay) so the frontend gets a clean success rather than a 400.
        if paper_attempt.completed_at:
            _comp = paper_attempt.completed_at
            _comp_utc = _comp if _comp.tzinfo is not None else _comp.replace(tzinfo=timezone.utc)
            time_since_completion = (get_utc_now() - _comp_utc).total_seconds()
            logger.info("[SUBMIT] attempt_id=%s completed_age_s=%.2f", attempt_id, time_since_completion)
            if time_since_completion > 90:
                logger.warning("[SUBMIT] attempt_id=%s rejected_stale_duplicate=true", attempt_id)
                raise HTTPException(status_code=400, detail="Attempt already completed")
            else:
                # Recent completion — this is a retry of an already-committed request
                logger.info("[SUBMIT] attempt_id=%s returning_existing=true", attempt_id)
                return PaperAttemptResponse.model_validate(paper_attempt)
        
        # Calculate results
        generated_blocks = paper_attempt.generated_blocks
        correct_count = 0
        wrong_count = 0
        
        # Flatten all questions from all blocks
        all_questions = []
        for block in generated_blocks:
            for question in block.get("questions", []):
                all_questions.append(question)
        
        # Check answers - count all questions, including unanswered ones
        for question in all_questions:
            try:
                question_id = question.get("id")
                # Use explicit None check instead of `or` - 0 is a valid answer and must not be treated as falsy
                _str_key = answers.get(str(question_id))
                _int_key = answers.get(question_id)
                user_answer = _str_key if _str_key is not None else _int_key
                correct_answer = question.get("answer")
                
                # Treat empty string as unattempted, but 0 is a valid answer
                user_answered = user_answer is not None and str(user_answer).strip() != ""
                
                if user_answered and correct_answer is not None:
                    # Compare answers - handle large integers as strings to avoid precision loss
                    try:
                        user_answer_str = str(user_answer).strip()
                        correct_answer_str = str(correct_answer)
                        user_has_decimal = '.' in user_answer_str or 'e' in user_answer_str.lower()
                        correct_has_decimal = '.' in correct_answer_str or 'e' in correct_answer_str.lower()
                        
                        if not user_has_decimal and not correct_has_decimal:
                            # Both are integers - compare as strings to preserve precision
                            if user_answer_str == correct_answer_str:
                                correct_count += 1
                            else:
                                wrong_count += 1
                        else:
                            # At least one has decimals - use float comparison with tolerance
                            if abs(float(user_answer) - float(correct_answer)) < 0.01:
                                correct_count += 1
                            else:
                                wrong_count += 1
                    except (ValueError, TypeError) as e:
                        logger.warning("[SUBMIT] compare_failed question_id=%s error=%s", question_id, e)
                        wrong_count += 1
                # Unattempted questions are not counted as wrong - they are separate
            except Exception as e:
                logger.warning("[SUBMIT] process_question_failed error=%s", e)
                # Count as wrong if we can't process it
                wrong_count += 1
                continue
        
        # Calculate accuracy and score
        total = paper_attempt.total_questions
        accuracy = (correct_count / total * 100) if total > 0 else 0
        score = correct_count
        
        # Calculate attempted questions (answered questions, right or wrong)
        attempted_questions = correct_count + wrong_count
        
        # Calculate points: +1 per attempted, +5 per correct
        points_earned = calculate_points(
            correct_answers=correct_count,
            total_questions=total,
            time_taken=time_taken,
            difficulty_mode="custom",  # Papers are custom
            accuracy=accuracy,
            is_mental_math=False,  # Paper attempt
            attempted_questions=attempted_questions
        )
        
        # Update attempt
        paper_attempt.answers = answers
        paper_attempt.correct_answers = correct_count
        paper_attempt.wrong_answers = wrong_count
        paper_attempt.accuracy = accuracy
        paper_attempt.score = score
        paper_attempt.time_taken = time_taken
        paper_attempt.points_earned = points_earned
        # Store completed_at as naive UTC datetime
        paper_attempt.completed_at = datetime.utcnow()
        
        # ── Award points (single atomic DB-level ADD) ─────────────────────────
        # Use a server-side expression so the increment is atomic even under
        # concurrent requests.  Avoid also doing `current_user.total_points +=`
        # because that would create an ORM dirty mark causing SQLAlchemy to emit
        # a second SET update on flush, potentially conflicting with this ADD.
        from sqlalchemy import update as sa_update
        balance_before = current_user.total_points
        balance_after  = balance_before + points_earned
        db.execute(
            sa_update(User)
            .where(User.id == current_user.id)
            .values(total_points=User.total_points + points_earned)
        )

        # ── Persist points log entry ──────────────────────────────────────────
        from points_logger import log_points
        log_points(
            db=db,
            user=current_user,
            points=points_earned,
            source_type="paper_attempt",
            description=(
                f"Practice paper: {paper_attempt.paper_title} ({paper_attempt.paper_level}): "
                f"{correct_count}/{attempted_questions} correct"
            ),
            source_id=paper_attempt.id,
            extra_data={
                "paper_title":  paper_attempt.paper_title,
                "paper_level":  paper_attempt.paper_level,
                "correct_answers": correct_count,
                "wrong_answers":   wrong_count,
                "attempted_questions": attempted_questions,
                "total_questions": total,
                "accuracy":       round(accuracy, 2),
                "balance_before": balance_before,
                "balance_after":  balance_after,
            }
        )
        
        db.commit()
        db.refresh(paper_attempt)
        db.refresh(current_user)  # Reload so total_points reflects the committed ADD
        
        elapsed = time.time() - request_start
        logger.info("[SUBMIT] path=/papers/attempt/%s duration_s=%.2f", attempt_id, elapsed)
        
        return PaperAttemptResponse.model_validate(paper_attempt)
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        # Rollback transaction on error
        db.rollback()
        import traceback
        error_msg = str(e)
        traceback_str = traceback.format_exc()
        logger.error("[PAPER_ATTEMPT] submit_failed error=%s", error_msg)
        logger.debug(traceback_str)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit paper attempt: {error_msg}"
        )


@app.get("/papers/attempt/{attempt_id}", response_model=PaperAttemptDetailResponse)
async def get_paper_attempt(
    attempt_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get details of a paper attempt."""
    paper_attempt = db.query(PaperAttempt).filter(
        PaperAttempt.id == attempt_id,
        PaperAttempt.user_id == current_user.id
    ).first()
    
    if not paper_attempt:
        raise HTTPException(status_code=404, detail="Paper attempt not found")
    
    # If attempt is incomplete and stale, mark it as abandoned
    if not paper_attempt.completed_at:
        utc_now = get_utc_now()
        started_at = paper_attempt.started_at
        if started_at.tzinfo is None:
            started_at = started_at.replace(tzinfo=timezone.utc)
        
        time_elapsed = (utc_now - started_at).total_seconds()
        if time_elapsed > INCOMPLETE_ATTEMPT_TIMEOUT_SECONDS:
            # Mark as abandoned
            paper_attempt.completed_at = utc_now.replace(tzinfo=None)
            paper_attempt.correct_answers = 0
            paper_attempt.wrong_answers = 0
            paper_attempt.accuracy = 0.0
            paper_attempt.score = 0
            paper_attempt.points_earned = 0
            db.commit()
            db.refresh(paper_attempt)
            logger.info("[CLEANUP] marked_stale_attempt=%s", attempt_id)
    
    return PaperAttemptDetailResponse.model_validate(paper_attempt)


@app.get("/papers/attempt/{attempt_id}/validate")
async def validate_paper_attempt(
    attempt_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Validate if a paper attempt is still valid for continuation.
    
    Returns:
    - valid: bool - Whether the attempt is valid to continue
    - reason: str - Reason if invalid (e.g., "completed", "expired", "not_found")
    - expires_at: Optional[datetime] - When the attempt will expire (if incomplete)
    """
    paper_attempt = db.query(PaperAttempt).filter(
        PaperAttempt.id == attempt_id,
        PaperAttempt.user_id == current_user.id
    ).first()
    
    if not paper_attempt:
        return {
            "valid": False,
            "reason": "not_found",
            "expires_at": None
        }
    
    # If already completed, cannot continue
    if paper_attempt.completed_at:
        return {
            "valid": False,
            "reason": "completed",
            "expires_at": None
        }
    
    # Check if attempt is stale (older than timeout)
    utc_now = get_utc_now()
    # Convert started_at to timezone-aware if it's naive (treat naive as UTC)
    started_at = paper_attempt.started_at
    if started_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=timezone.utc)
    
    time_elapsed = (utc_now - started_at).total_seconds()
    
    if time_elapsed > INCOMPLETE_ATTEMPT_TIMEOUT_SECONDS:
        return {
            "valid": False,
            "reason": "expired",
            "expires_at": None
        }
    
    # Calculate when it will expire
    expires_at = started_at + timedelta(seconds=INCOMPLETE_ATTEMPT_TIMEOUT_SECONDS)
    
    return {
        "valid": True,
        "reason": None,
        "expires_at": expires_at.replace(tzinfo=None).isoformat() if expires_at else None
    }

