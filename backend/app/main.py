import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import Base, engine
from app.routers import auth, dashboard, documents, gold, loans, properties, silver


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    # Add doc_type column if it doesn't exist yet (safe to run repeatedly)
    with engine.connect() as conn:
        try:
            conn.execute(text(
                "ALTER TABLE documents ADD COLUMN doc_type VARCHAR NOT NULL DEFAULT 'document'"
            ))
            conn.commit()
        except Exception:
            conn.rollback()
    yield


app = FastAPI(title="Personal Asset & Liability Tracker", lifespan=lifespan)

default_origins = "http://localhost:5173,http://localhost:5174"
allowed_origins = os.environ.get("ALLOWED_ORIGINS", default_origins).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(properties.router)
app.include_router(gold.router)
app.include_router(silver.router)
app.include_router(loans.router)
app.include_router(dashboard.router)
app.include_router(documents.router)


@app.get("/")
def root():
    return {"status": "ok"}
