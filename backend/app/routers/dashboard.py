from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.market_rates import get_all_rates
from app.security import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=schemas.DashboardSummary)
def get_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    gold_rate, silver_rate, platinum_rate = get_all_rates()
    uid = current_user.id

    properties = db.query(models.Property).filter(models.Property.user_id == uid).all()
    gold_assets = db.query(models.GoldAsset).filter(models.GoldAsset.user_id == uid).all()
    silver_assets = db.query(models.SilverAsset).filter(models.SilverAsset.user_id == uid).all()
    loans = db.query(models.Loan).filter(models.Loan.user_id == uid).all()
    fds = db.query(models.FixedDeposit).filter(models.FixedDeposit.user_id == uid).all()
    mfs = db.query(models.MutualFund).filter(models.MutualFund.user_id == uid).all()
    vehicles = db.query(models.Vehicle).filter(models.Vehicle.user_id == uid).all()
    others = db.query(models.OtherAsset).filter(models.OtherAsset.user_id == uid).all()

    total_real_estate_value = sum(p.current_value for p in properties)
    total_gold_value = sum(g.weight_grams * gold_rate * (g.purity_karat / 24) for g in gold_assets)
    total_silver_value = sum(s.weight_grams * silver_rate * (s.purity_percent / 100) for s in silver_assets)
    total_fd_value = sum(fd.maturity_value for fd in fds)
    total_mf_value = sum(mf.current_value for mf in mfs)
    total_vehicle_value = sum(v.current_value for v in vehicles)
    total_other_value = sum(o.current_value for o in others)

    total_assets = (
        total_real_estate_value + total_gold_value + total_silver_value +
        total_fd_value + total_mf_value + total_vehicle_value + total_other_value
    )
    total_liabilities = sum(l.remaining_balance for l in loans)

    return schemas.DashboardSummary(
        total_real_estate_value=total_real_estate_value,
        total_gold_value=total_gold_value,
        total_silver_value=total_silver_value,
        total_fd_value=total_fd_value,
        total_mf_value=total_mf_value,
        total_vehicle_value=total_vehicle_value,
        total_other_value=total_other_value,
        total_assets=total_assets,
        total_liabilities=total_liabilities,
        net_worth=total_assets - total_liabilities,
        gold_rate_per_gram_24k=gold_rate,
        silver_rate_per_gram=silver_rate,
        platinum_rate_per_gram=platinum_rate,
    )
