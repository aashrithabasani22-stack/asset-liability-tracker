from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.security import get_current_user

router = APIRouter(prefix="/silver", tags=["silver"])


@router.post("", response_model=schemas.SilverAssetOut)
def create_silver_asset(
    payload: schemas.SilverAssetCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = models.SilverAsset(**payload.model_dump(), user_id=current_user.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("", response_model=list[schemas.SilverAssetOut])
def list_silver_assets(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return db.query(models.SilverAsset).filter(models.SilverAsset.user_id == current_user.id).all()


@router.get("/{item_id}", response_model=schemas.SilverAssetOut)
def get_silver_asset(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return _get_owned(db, item_id, current_user.id)


@router.put("/{item_id}", response_model=schemas.SilverAssetOut)
def update_silver_asset(
    item_id: int,
    payload: schemas.SilverAssetCreate,
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
def delete_silver_asset(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = _get_owned(db, item_id, current_user.id)
    db.delete(item)
    db.commit()


def _get_owned(db: Session, item_id: int, user_id: int) -> models.SilverAsset:
    item = (
        db.query(models.SilverAsset)
        .filter(models.SilverAsset.id == item_id, models.SilverAsset.user_id == user_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Silver asset not found")
    return item
