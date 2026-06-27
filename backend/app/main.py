import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import auth, dashboard, documents, gold, loans, properties, silver

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Personal Asset & Liability Tracker")

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
