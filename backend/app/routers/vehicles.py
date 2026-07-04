from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app import models, schemas
from app.database import get_db
from app.security import get_current_user

router = APIRouter(prefix="/vehicles", tags=["vehicles"])

def _get(db, item_id, user_id):
    item = db.query(models.Vehicle).filter(models.Vehicle.id == item_id, models.Vehicle.user_id == user_id).first()
    if not item: raise HTTPException(404, "Not found")
    return item

@router.post("", response_model=schemas.VehicleOut)
def create(payload: schemas.VehicleCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    item = models.Vehicle(**payload.model_dump(), user_id=user.id)
    db.add(item); db.commit(); db.refresh(item); return item

@router.get("", response_model=list[schemas.VehicleOut])
def list_all(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(models.Vehicle).filter(models.Vehicle.user_id == user.id).all()

@router.put("/{item_id}", response_model=schemas.VehicleOut)
def update(item_id: int, payload: schemas.VehicleCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    item = _get(db, item_id, user.id)
    for k, v in payload.model_dump().items(): setattr(item, k, v)
    db.commit(); db.refresh(item); return item

@router.delete("/{item_id}", status_code=204)
def delete(item_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    item = _get(db, item_id, user.id); db.delete(item); db.commit()
