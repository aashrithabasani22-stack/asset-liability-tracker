from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.security import get_current_user

router = APIRouter(prefix="/gold", tags=["gold"])


@router.post("", response_model=schemas.GoldAssetOut)
def create_gold_asset(
    payload: schemas.GoldAssetCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = models.GoldAsset(**payload.model_dump(), user_id=current_user.id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("", response_model=list[schemas.GoldAssetOut])
def list_gold_assets(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return db.query(models.GoldAsset).filter(models.GoldAsset.user_id == current_user.id).all()


@router.get("/{item_id}", response_model=schemas.GoldAssetOut)
def get_gold_asset(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return _get_owned(db, item_id, current_user.id)


@router.put("/{item_id}", response_model=schemas.GoldAssetOut)
def update_gold_asset(
    item_id: int,
    payload: schemas.GoldAssetCreate,
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
def delete_gold_asset(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = _get_owned(db, item_id, current_user.id)
    db.delete(item)
    db.commit()


def _get_owned(db: Session, item_id: int, user_id: int) -> models.GoldAsset:
    item = (
        db.query(models.GoldAsset)
        .filter(models.GoldAsset.id == item_id, models.GoldAsset.user_id == user_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Gold asset not found")
    return item
