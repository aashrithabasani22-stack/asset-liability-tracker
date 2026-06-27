from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.market_rates import get_gold_silver_rates
from app.security import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=schemas.DashboardSummary)
def get_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    gold_rate, silver_rate = get_gold_silver_rates()

    properties = db.query(models.Property).filter(models.Property.user_id == current_user.id).all()
    gold_assets = db.query(models.GoldAsset).filter(models.GoldAsset.user_id == current_user.id).all()
    silver_assets = db.query(models.SilverAsset).filter(models.SilverAsset.user_id == current_user.id).all()
    loans = db.query(models.Loan).filter(models.Loan.user_id == current_user.id).all()

    total_real_estate_value = sum(p.current_value for p in properties)
    total_gold_value = sum(
        g.weight_grams * gold_rate * (g.purity_karat / 24) for g in gold_assets
    )
    total_silver_value = sum(
        s.weight_grams * silver_rate * (s.purity_percent / 100) for s in silver_assets
    )
    total_assets = total_real_estate_value + total_gold_value + total_silver_value
    total_liabilities = sum(l.remaining_balance for l in loans)

    return schemas.DashboardSummary(
        total_real_estate_value=total_real_estate_value,
        total_gold_value=total_gold_value,
        total_silver_value=total_silver_value,
        total_assets=total_assets,
        total_liabilities=total_liabilities,
        net_worth=total_assets - total_liabilities,
        gold_rate_per_gram_24k=gold_rate,
        silver_rate_per_gram=silver_rate,
    )
