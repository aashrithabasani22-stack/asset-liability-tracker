from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.security import get_current_user

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=list[schemas.TransactionOut])
def list_transactions(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return (
        db.query(models.Transaction)
        .filter(models.Transaction.user_id == current_user.id)
        .order_by(models.Transaction.date.desc())
        .all()
    )


@router.post("", response_model=schemas.TransactionOut)
def create_transaction(
    body: schemas.TransactionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    tx = models.Transaction(**body.model_dump(), user_id=current_user.id)
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


@router.put("/{tx_id}", response_model=schemas.TransactionOut)
def update_transaction(
    tx_id: int,
    body: schemas.TransactionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    tx = db.query(models.Transaction).filter(
        models.Transaction.id == tx_id,
        models.Transaction.user_id == current_user.id,
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Not found")
    for k, v in body.model_dump().items():
        setattr(tx, k, v)
    db.commit()
    db.refresh(tx)
    return tx


@router.delete("/{tx_id}")
def delete_transaction(
    tx_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    tx = db.query(models.Transaction).filter(
        models.Transaction.id == tx_id,
        models.Transaction.user_id == current_user.id,
    ).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(tx)
    db.commit()
    return {"detail": "Deleted"}


@router.get("/summary/{month}", response_model=schemas.MonthlySummary)
def monthly_summary(
    month: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    txs = (
        db.query(models.Transaction)
        .filter(
            models.Transaction.user_id == current_user.id,
            models.Transaction.date.startswith(month),
        )
        .all()
    )
    total_income = sum(t.amount for t in txs if t.type == "income")
    total_expenses = sum(t.amount for t in txs if t.type == "expense")
    by_category: dict[str, float] = {}
    for t in txs:
        if t.type == "expense":
            by_category[t.category] = by_category.get(t.category, 0) + t.amount
    return schemas.MonthlySummary(
        month=month,
        total_income=total_income,
        total_expenses=total_expenses,
        net_savings=total_income - total_expenses,
        by_category=by_category,
    )
