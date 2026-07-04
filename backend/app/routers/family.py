import secrets
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.market_rates import get_all_rates
from app.security import get_current_user

router = APIRouter(prefix="/family", tags=["family"])


def _net_worth_for_user(uid: int, db: Session) -> schemas.FamilyMemberSummary:
    gold_rate, silver_rate, _ = get_all_rates()

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

    total_assets = (
        sum(p.current_value for p in properties)
        + sum(g.weight_grams * gold_rate * (g.purity_karat / 24) for g in gold_assets)
        + sum(s.weight_grams * silver_rate * (s.purity_percent / 100) for s in silver_assets)
        + sum(fd.maturity_value for fd in fds)
        + sum(mf.current_value for mf in mfs)
        + sum(v.current_value for v in vehicles)
        + sum(o.current_value for o in others)
        + sum(b.balance for b in bank_accounts)
    )
    total_liabilities = (
        sum(l.remaining_balance for l in loans)
        + sum(c.outstanding_amount for c in credit_cards)
    )
    return total_assets, total_liabilities


def _get_my_group(uid: int, db: Session) -> models.FamilyGroup | None:
    member = db.query(models.FamilyMember).filter(models.FamilyMember.user_id == uid).first()
    if not member:
        return None
    return db.query(models.FamilyGroup).filter(models.FamilyGroup.id == member.group_id).first()


@router.get("/group", response_model=schemas.FamilyGroupOut)
def get_my_group(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    group = _get_my_group(current_user.id, db)
    if not group:
        raise HTTPException(status_code=404, detail="Not in a family group")
    result = schemas.FamilyGroupOut(
        id=group.id,
        name=group.name,
        owner_id=group.owner_id,
        invite_code=group.invite_code,
        created_at=group.created_at,
        members=[
            schemas.FamilyMemberOut(
                id=m.id,
                user_id=m.user_id,
                name=m.user.name,
                email=m.user.email,
                joined_at=m.joined_at,
            )
            for m in group.members
        ],
    )
    return result


@router.post("/create", response_model=schemas.FamilyGroupOut)
def create_group(
    body: schemas.FamilyGroupCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    existing = _get_my_group(current_user.id, db)
    if existing:
        raise HTTPException(status_code=400, detail="You are already in a family group. Leave it first.")

    code = secrets.token_urlsafe(8)
    group = models.FamilyGroup(name=body.name, owner_id=current_user.id, invite_code=code)
    db.add(group)
    db.flush()

    member = models.FamilyMember(group_id=group.id, user_id=current_user.id)
    db.add(member)
    db.commit()
    db.refresh(group)

    return schemas.FamilyGroupOut(
        id=group.id,
        name=group.name,
        owner_id=group.owner_id,
        invite_code=group.invite_code,
        created_at=group.created_at,
        members=[
            schemas.FamilyMemberOut(
                id=m.id, user_id=m.user_id,
                name=m.user.name, email=m.user.email,
                joined_at=m.joined_at,
            )
            for m in group.members
        ],
    )


@router.post("/join")
def join_group(
    body: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    code = body.get("invite_code", "").strip()
    if not code:
        raise HTTPException(status_code=400, detail="invite_code required")

    existing = _get_my_group(current_user.id, db)
    if existing:
        raise HTTPException(status_code=400, detail="You are already in a family group. Leave it first.")

    group = db.query(models.FamilyGroup).filter(models.FamilyGroup.invite_code == code).first()
    if not group:
        raise HTTPException(status_code=404, detail="Invalid invite code")

    already = db.query(models.FamilyMember).filter(
        models.FamilyMember.group_id == group.id,
        models.FamilyMember.user_id == current_user.id,
    ).first()
    if already:
        raise HTTPException(status_code=400, detail="Already a member")

    member = models.FamilyMember(group_id=group.id, user_id=current_user.id)
    db.add(member)
    db.commit()
    return {"detail": f"Joined '{group.name}'"}


@router.delete("/leave")
def leave_group(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    group = _get_my_group(current_user.id, db)
    if not group:
        raise HTTPException(status_code=404, detail="Not in a family group")

    if group.owner_id == current_user.id:
        db.delete(group)
        db.commit()
        return {"detail": "Group deleted (you were the owner)"}

    member = db.query(models.FamilyMember).filter(
        models.FamilyMember.group_id == group.id,
        models.FamilyMember.user_id == current_user.id,
    ).first()
    db.delete(member)
    db.commit()
    return {"detail": "Left the group"}


@router.get("/dashboard", response_model=schemas.FamilyDashboard)
def family_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    group = _get_my_group(current_user.id, db)
    if not group:
        raise HTTPException(status_code=404, detail="Not in a family group")

    members_out = []
    combined_assets = 0.0
    combined_liabilities = 0.0

    for m in group.members:
        assets, liabilities = _net_worth_for_user(m.user_id, db)
        combined_assets += assets
        combined_liabilities += liabilities
        members_out.append(schemas.FamilyMemberSummary(
            user_id=m.user_id,
            name=m.user.name,
            email=m.user.email,
            net_worth=assets - liabilities,
            total_assets=assets,
            total_liabilities=liabilities,
        ))

    return schemas.FamilyDashboard(
        group_name=group.name,
        members=members_out,
        combined_net_worth=combined_assets - combined_liabilities,
        combined_assets=combined_assets,
        combined_liabilities=combined_liabilities,
    )
