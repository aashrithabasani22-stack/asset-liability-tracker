from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.security import get_current_user

router = APIRouter(prefix="/budgets", tags=["budgets"])


@router.get("/{month}", response_model=list[schemas.BudgetOut])
def list_budgets(month: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(models.Budget).filter(
        models.Budget.user_id == user.id,
        models.Budget.month == month,
    ).order_by(models.Budget.category).all()


@router.put("/{month}/{category}", response_model=schemas.BudgetOut)
def upsert_budget(
    month: str, category: str, body: schemas.BudgetCreate,
    db: Session = Depends(get_db), user=Depends(get_current_user),
):
    existing = db.query(models.Budget).filter(
        models.Budget.user_id == user.id,
        models.Budget.month == month,
        models.Budget.category == category,
    ).first()
    if existing:
        existing.limit_amount = body.limit_amount
        db.commit()
        db.refresh(existing)
        return existing
    budget = models.Budget(user_id=user.id, month=month, category=category, limit_amount=body.limit_amount)
    db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget


@router.delete("/{month}/{category}")
def delete_budget(month: str, category: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    b = db.query(models.Budget).filter(
        models.Budget.user_id == user.id,
        models.Budget.month == month,
        models.Budget.category == category,
    ).first()
    if not b:
        raise HTTPException(404, "Not found")
    db.delete(b)
    db.commit()
    return {"ok": True}


@router.get("/vs-actual/{month}", response_model=list[schemas.BudgetVsActual])
def budget_vs_actual(month: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    budgets = db.query(models.Budget).filter(
        models.Budget.user_id == user.id,
        models.Budget.month == month,
    ).all()

    txs = db.query(models.Transaction).filter(
        models.Transaction.user_id == user.id,
        models.Transaction.type == "expense",
        models.Transaction.date.startswith(month),
    ).all()

    spending: dict[str, float] = {}
    for t in txs:
        spending[t.category] = spending.get(t.category, 0) + t.amount

    result = []
    for b in budgets:
        spent = spending.get(b.category, 0)
        remaining = max(0, b.limit_amount - spent)
        pct = min(100, (spent / b.limit_amount * 100) if b.limit_amount > 0 else 0)
        result.append(schemas.BudgetVsActual(
            category=b.category,
            limit_amount=b.limit_amount,
            spent=spent,
            remaining=remaining,
            pct=pct,
            over=spent > b.limit_amount,
        ))

    result.sort(key=lambda x: (-x.pct, x.category))
    return result
