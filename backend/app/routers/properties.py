from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.security import get_current_user

router = APIRouter(prefix="/properties", tags=["properties"])


@router.post("", response_model=schemas.PropertyOut)
def create_property(
    payload: schemas.PropertyCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = models.Property(**payload.model_dump(), user_id=current_user.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("", response_model=list[schemas.PropertyOut])
def list_properties(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return db.query(models.Property).filter(models.Property.user_id == current_user.id).all()


@router.get("/{item_id}", response_model=schemas.PropertyOut)
def get_property(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = _get_owned(db, item_id, current_user.id)
    return item


@router.put("/{item_id}", response_model=schemas.PropertyOut)
def update_property(
    item_id: int,
    payload: schemas.PropertyCreate,
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
def delete_property(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = _get_owned(db, item_id, current_user.id)
    db.delete(item)
    db.commit()


def _get_owned(db: Session, item_id: int, user_id: int) -> models.Property:
    item = (
        db.query(models.Property)
        .filter(models.Property.id == item_id, models.Property.user_id == user_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Property not found")
    return item
