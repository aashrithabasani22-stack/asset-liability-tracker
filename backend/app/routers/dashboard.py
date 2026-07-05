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
    bank_accounts = db.query(models.BankAccount).filter(models.BankAccount.user_id == uid).all()
    credit_cards = db.query(models.CreditCard).filter(models.CreditCard.user_id == uid).all()

    total_real_estate_value = sum(p.current_value for p in properties)
    total_gold_value = sum(g.weight_grams * gold_rate * (g.purity_karat / 24) for g in gold_assets)
    total_silver_value = sum(s.weight_grams * silver_rate * (s.purity_percent / 100) for s in silver_assets)
    total_fd_value = sum(fd.maturity_value for fd in fds)
    total_mf_value = sum(mf.current_value for mf in mfs)
    total_vehicle_value = sum(v.current_value for v in vehicles)
    total_other_value = sum(o.current_value for o in others)
    total_bank_balance = sum(b.balance for b in bank_accounts)

    total_assets = (
        total_real_estate_value + total_gold_value + total_silver_value +
        total_fd_value + total_mf_value + total_vehicle_value + total_other_value +
        total_bank_balance
    )

    total_loan_balance = sum(l.remaining_balance for l in loans)
    total_credit_card_outstanding = sum(c.outstanding_amount for c in credit_cards)
    total_liabilities = total_loan_balance + total_credit_card_outstanding

    return schemas.DashboardSummary(
        total_real_estate_value=total_real_estate_value,
        total_gold_value=total_gold_value,
        total_silver_value=total_silver_value,
        total_fd_value=total_fd_value,
        total_mf_value=total_mf_value,
        total_vehicle_value=total_vehicle_value,
        total_other_value=total_other_value,
        total_bank_balance=total_bank_balance,
        total_assets=total_assets,
        total_credit_card_outstanding=total_credit_card_outstanding,
        total_liabilities=total_liabilities,
        net_worth=total_assets - total_liabilities,
        gold_rate_per_gram_24k=gold_rate,
        silver_rate_per_gram=silver_rate,
        platinum_rate_per_gram=platinum_rate,
    )


@router.get("/portfolio", response_model=schemas.PortfolioReturn)
def get_portfolio(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    uid = current_user.id
    items = []

    for p in db.query(models.Property).filter(models.Property.user_id == uid).all():
        if p.purchase_price:
            gain = p.current_value - p.purchase_price
            items.append(schemas.PortfolioItem(
                name=p.address, asset_type="Real Estate",
                purchase_price=p.purchase_price, current_value=p.current_value,
                gain=gain, gain_pct=(gain / p.purchase_price * 100) if p.purchase_price else 0,
            ))

    for m in db.query(models.MutualFund).filter(models.MutualFund.user_id == uid).all():
        if m.purchase_price:
            gain = m.current_value - m.purchase_price
            items.append(schemas.PortfolioItem(
                name=m.fund_name, asset_type="MF & Stocks",
                purchase_price=m.purchase_price, current_value=m.current_value,
                gain=gain, gain_pct=(gain / m.purchase_price * 100) if m.purchase_price else 0,
            ))

    for v in db.query(models.Vehicle).filter(models.Vehicle.user_id == uid).all():
        if v.purchase_price:
            gain = v.current_value - v.purchase_price
            items.append(schemas.PortfolioItem(
                name=v.name, asset_type="Vehicle",
                purchase_price=v.purchase_price, current_value=v.current_value,
                gain=gain, gain_pct=(gain / v.purchase_price * 100) if v.purchase_price else 0,
            ))

    for o in db.query(models.OtherAsset).filter(models.OtherAsset.user_id == uid).all():
        if o.purchase_price:
            gain = o.current_value - o.purchase_price
            items.append(schemas.PortfolioItem(
                name=o.name, asset_type="Other",
                purchase_price=o.purchase_price, current_value=o.current_value,
                gain=gain, gain_pct=(gain / o.purchase_price * 100) if o.purchase_price else 0,
            ))

    total_invested = sum(i.purchase_price for i in items)
    total_current = sum(i.current_value for i in items)
    total_gain = total_current - total_invested
    return schemas.PortfolioReturn(
        items=items,
        total_invested=total_invested,
        total_current=total_current,
        total_gain=total_gain,
        total_gain_pct=(total_gain / total_invested * 100) if total_invested else 0,
    )
