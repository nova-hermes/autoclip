"""FastAPI application entry point"""

import logging
import os
import traceback
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

# Configure logging FIRST (console only — Railway captures stdout)
log_level = os.environ.get("LOG_LEVEL", "INFO")
logging.basicConfig(
    level=getattr(logging, log_level, logging.INFO),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger(__name__)

# Create FastAPI app IMMEDIATELY — health check works even if imports fail
app = FastAPI(
    title="AutoClip API",
    description="AI Video Clipping API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Health check — works regardless of import state
@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Safe imports with error reporting ---
_import_errors = []

# Config
try:
    from .core.config import settings, get_api_key
except Exception as e:
    logger.error(f"Config import failed: {e}")
    _import_errors.append(f"config: {e}")
    settings = None

# Database
try:
    from .core.database import engine
    from .models.base import Base
except Exception as e:
    logger.error(f"Database import failed: {e}")
    _import_errors.append(f"database: {e}")
    engine = None
    Base = None

# API routes
try:
    from .api.v1 import api_router
    app.include_router(api_router, prefix="/api/v1")
    logger.info("API routes registered")
except Exception as e:
    logger.error(f"API router import failed: {e}\n{traceback.format_exc()}")
    _import_errors.append(f"api_router: {e}")

# Error middleware
try:
    from .core.error_middleware import global_exception_handler
    app.add_exception_handler(Exception, global_exception_handler)
except Exception as e:
    logger.error(f"Error middleware import failed: {e}")
    _import_errors.append(f"error_middleware: {e}")

# Startup event
@app.on_event("startup")
async def startup_event():
    logger.info("Starting AutoClip API...")
    if _import_errors:
        logger.warning(f"Import errors (degraded mode): {_import_errors}")

    # Database tables
    if engine and Base:
        try:
            from .models.bilibili import BilibiliAccount, UploadRecord
            Base.metadata.create_all(bind=engine)
            logger.info("Database tables created")
        except Exception as e:
            logger.error(f"Database init failed: {e}")

    # Load API key
    try:
        if settings:
            api_key = get_api_key()
            if api_key:
                os.environ["DASHSCOPE_API_KEY"] = api_key
                logger.info("API key loaded")
    except Exception as e:
        logger.error(f"API key load failed: {e}")

    logger.info(f"AutoClip started (errors: {len(_import_errors)})")

# Import status endpoint
@app.get("/api/v1/status")
async def status():
    return {
        "status": "running",
        "import_errors": _import_errors,
        "degraded": len(_import_errors) > 0
    }

# Serve frontend static files (production)
FRONTEND_DIR = Path(__file__).parent.parent / "frontend" / "dist"
if FRONTEND_DIR.exists():
    try:
        # Serve landing page at root
        @app.get("/")
        async def serve_landing():
            landing = FRONTEND_DIR / "landing.html"
            if landing.exists():
                return FileResponse(str(landing))
            return FileResponse(str(FRONTEND_DIR / "index.html"))

        # Serve static assets
        assets_dir = FRONTEND_DIR / "assets"
        if assets_dir.exists():
            app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

        # SPA fallback
        @app.get("/{path:path}")
        async def serve_spa(path: str):
            if path.startswith("api/") or path.startswith("docs") or path.startswith("redoc"):
                return JSONResponse(status_code=404, content={"detail": "Not found"})
            file_path = FRONTEND_DIR / path
            if file_path.is_file():
                return FileResponse(str(file_path))
            return FileResponse(str(FRONTEND_DIR / "index.html"))

        logger.info("Frontend static files mounted")
    except Exception as e:
        logger.error(f"Frontend mount failed: {e}")

if __name__ == "__main__":
    import uvicorn
    import sys
    port = 8000
    if len(sys.argv) > 1:
        for i, arg in enumerate(sys.argv):
            if arg == "--port" and i + 1 < len(sys.argv):
                try:
                    port = int(sys.argv[i + 1])
                except ValueError:
                    port = 8000
    logger.info(f"Starting server on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
