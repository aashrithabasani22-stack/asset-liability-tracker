from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.security import get_current_user

router = APIRouter(prefix="/loans", tags=["loans"])


@router.post("", response_model=schemas.LoanOut)
def create_loan(
    payload: schemas.LoanCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = models.Loan(**payload.model_dump(), user_id=current_user.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("", response_model=list[schemas.LoanOut])
def list_loans(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return db.query(models.Loan).filter(models.Loan.user_id == current_user.id).all()


@router.get("/{item_id}", response_model=schemas.LoanOut)
def get_loan(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return _get_owned(db, item_id, current_user.id)


@router.put("/{item_id}", response_model=schemas.LoanOut)
def update_loan(
    item_id: int,
    payload: schemas.LoanCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = _get_owned(db, item_id, current_user.id)
    for key, value in payload.model_dump().items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
def delete_loan(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = _get_owned(db, item_id, current_user.id)
    db.delete(item)
    db.commit()


def _get_owned(db: Session, item_id: int, user_id: int) -> models.Loan:
    item = (
        db.query(models.Loan)
        .filter(models.Loan.id == item_id, models.Loan.user_id == user_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Loan not found")
    return item
