from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import SavingsGoal
from app.schemas import SavingsGoalCreate, SavingsGoalOut
from app.routers.auth import get_current_user

router = APIRouter(prefix="/goals", tags=["goals"])


@router.get("", response_model=list[SavingsGoalOut])
def list_goals(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(SavingsGoal).filter(SavingsGoal.user_id == user.id).order_by(SavingsGoal.created_at).all()


@router.post("", response_model=SavingsGoalOut)
def create_goal(body: SavingsGoalCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    goal = SavingsGoal(**body.model_dump(), user_id=user.id)
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@router.put("/{goal_id}", response_model=SavingsGoalOut)
def update_goal(goal_id: int, body: SavingsGoalCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    goal = db.query(SavingsGoal).filter(SavingsGoal.id == goal_id, SavingsGoal.user_id == user.id).first()
    if not goal:
        raise HTTPException(404, "Goal not found")
    for k, v in body.model_dump().items():
        setattr(goal, k, v)
    db.commit()
    db.refresh(goal)
    return goal


@router.delete("/{goal_id}")
def delete_goal(goal_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    goal = db.query(SavingsGoal).filter(SavingsGoal.id == goal_id, SavingsGoal.user_id == user.id).first()
    if not goal:
        raise HTTPException(404, "Goal not found")
    db.delete(goal)
    db.commit()
    return {"ok": True}
