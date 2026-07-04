from datetime import date
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.market_rates import get_all_rates
from app.security import get_current_user

router = APIRouter(prefix="/networth", tags=["networth"])


def _compute(uid: int, db: Session):
    gold_rate, silver_rate, _ = get_all_rates()
    properties = db.query(models.Property).filter(models.Property.user_id == uid).all()
    gold_assets = db.query(models.GoldAsset).filter(models.GoldAsset.user_id == uid).all()
    silver_assets = db.query(models.SilverAsset).filter(models.SilverAsset.user_id == uid).all()
    loans = db.query(models.Loan).filter(models.Loan.user_id == uid).all()
    fds = db.query(models.FixedDeposit).filter(models.FixedDeposit.user_id == uid).all()
    mfs = db.query(models.MutualFund).filter(models.MutualFund.user_id == uid).all()
    vehicles = db.query(models.Vehicle).filter(models.Vehicle.user_id == uid).all()
    others = db.query(models.OtherAsset).filter(models.OtherAsset.user_id == uid).all()
    bank_accounts = db.query(models.BankAccount).filter(models.BankAccount.user_id == uid).all()
    credit_cards = db.query(models.CreditCard).filter(models.CreditCard.user_id == uid).all()

    total_assets = (
        sum(p.current_value for p in properties)
        + sum(g.weight_grams * gold_rate * (g.purity_karat / 24) for g in gold_assets)
        + sum(s.weight_grams * silver_rate * (s.purity_percent / 100) for s in silver_assets)
        + sum(fd.maturity_value for fd in fds)
        + sum(mf.current_value for mf in mfs)
        + sum(v.current_value for v in vehicles)
        + sum(o.current_value for o in others)
        + sum(b.balance for b in bank_accounts)
    )
    total_liabilities = (
        sum(l.remaining_balance for l in loans)
        + sum(c.outstanding_amount for c in credit_cards)
    )
    return total_assets, total_liabilities


@router.post("/snapshot", response_model=schemas.SnapshotOut)
def save_snapshot(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    today = date.today().isoformat()
    total_assets, total_liabilities = _compute(current_user.id, db)
    net_worth = total_assets - total_liabilities

    existing = db.query(models.NetWorthSnapshot).filter(
        models.NetWorthSnapshot.user_id == current_user.id,
        models.NetWorthSnapshot.date == today,
    ).first()

    if existing:
        existing.net_worth = net_worth
        existing.total_assets = total_assets
        existing.total_liabilities = total_liabilities
        db.commit()
        snap = existing
    else:
        snap = models.NetWorthSnapshot(
            user_id=current_user.id,
            date=today,
            net_worth=net_worth,
            total_assets=total_assets,
            total_liabilities=total_liabilities,
        )
        db.add(snap)
        db.commit()
        db.refresh(snap)

    return schemas.SnapshotOut(
        date=snap.date,
        net_worth=snap.net_worth,
        total_assets=snap.total_assets,
        total_liabilities=snap.total_liabilities,
    )


@router.get("/history", response_model=list[schemas.SnapshotOut])
def get_history(
    days: int = 90,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    snaps = (
        db.query(models.NetWorthSnapshot)
        .filter(models.NetWorthSnapshot.user_id == current_user.id)
        .order_by(models.NetWorthSnapshot.date.asc())
        .limit(days)
        .all()
    )
    return [
        schemas.SnapshotOut(
            date=s.date,
            net_worth=s.net_worth,
            total_assets=s.total_assets,
            total_liabilities=s.total_liabilities,
        )
        for s in snaps
    ]
