import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import Base, engine
from app.routers import (
    auth, dashboard, documents, gold, loans, properties, silver,
    fixed_deposits, mutual_funds, vehicles, other_assets,
    bank_accounts, credit_cards, family, networth, transactions,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    # Add new columns if they don't exist yet (safe to run repeatedly)
    migrations = [
        "ALTER TABLE documents ADD COLUMN doc_type VARCHAR NOT NULL DEFAULT 'document'",
        "ALTER TABLE loans ADD COLUMN principal_amount FLOAT NOT NULL DEFAULT 0",
        "ALTER TABLE loans ADD COLUMN payment_bank VARCHAR",
        "ALTER TABLE loans ADD COLUMN next_due_date VARCHAR",
        "ALTER TABLE properties ADD COLUMN purchase_price FLOAT",
        "ALTER TABLE mutual_funds ADD COLUMN purchase_price FLOAT",
        "ALTER TABLE vehicles ADD COLUMN purchase_price FLOAT",
        "ALTER TABLE other_assets ADD COLUMN purchase_price FLOAT",
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
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
app.include_router(fixed_deposits.router)
app.include_router(mutual_funds.router)
app.include_router(vehicles.router)
app.include_router(other_assets.router)
app.include_router(bank_accounts.router)
app.include_router(credit_cards.router)
app.include_router(family.router)
app.include_router(networth.router)
app.include_router(transactions.router)


@app.get("/")
def root():
    return {"status": "ok"}
