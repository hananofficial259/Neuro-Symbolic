import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.api.patches import router as patches_router
from backend.app.api.projects import router as projects_router
from backend.app.api.reports import router as reports_router
from backend.app.api.scans import router as scans_router
from backend.app.api.uploads import router as uploads_router
from backend.app.db.database import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Neuro-Symbolic Software Foundry API",
    description="Mathematical invariant verification and deterministic code analysis platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects_router, prefix="/api/v1")
app.include_router(uploads_router, prefix="/api/v1")
app.include_router(scans_router, prefix="/api/v1")
app.include_router(patches_router, prefix="/api/v1")
app.include_router(reports_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "neuro-symbolic-foundry-api",
        "version": "1.0.0",
    }


@app.get("/api/v1/info")
async def system_info():
    return {
        "platform": "Neuro-Symbolic Software Foundry",
        "supported_languages": ["Python 3.12+"],
        "active_engines": ["Z3 SMT Solver / Symbolic Checker", "Pytest 8+", "Semgrep AST Security"],
        "version": "1.0.0",
    }


FRONTEND_DIST_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../frontend/dist"))
if os.path.exists(FRONTEND_DIST_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIST_DIR, html=True), name="frontend")
