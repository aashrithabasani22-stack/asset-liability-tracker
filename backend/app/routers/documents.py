import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.security import get_current_user

router = APIRouter(prefix="/documents", tags=["documents"])

UPLOAD_ROOT = Path(__file__).resolve().parent.parent.parent / "uploads"

ASSET_MODELS = {
    "property": models.Property,
    "gold": models.GoldAsset,
    "silver": models.SilverAsset,
    "loan": models.Loan,
    "fd": models.FixedDeposit,
    "mf": models.MutualFund,
    "vehicle": models.Vehicle,
    "other": models.OtherAsset,
    "bank": models.BankAccount,
    "cc": models.CreditCard,
}

MAX_UPLOAD_BYTES = 10 * 1024 * 1024


def _asset_model(asset_type: str):
    model = ASSET_MODELS.get(asset_type)
    if model is None:
        raise HTTPException(status_code=400, detail="Invalid asset type")
    return model


def _assert_asset_owned(db: Session, asset_type: str, asset_id: int, user_id: int):
    model = _asset_model(asset_type)
    exists = (
        db.query(model.id)
        .filter(model.id == asset_id, model.user_id == user_id)
        .first()
    )
    if not exists:
        raise HTTPException(status_code=404, detail="Asset not found")


def _to_out(doc: models.Document) -> schemas.DocumentOut:
    return schemas.DocumentOut(
        id=doc.id,
        asset_type=doc.asset_type,
        asset_id=doc.asset_id,
        original_filename=doc.original_filename,
        content_type=doc.content_type,
        doc_type=doc.doc_type or "document",
        created_at=doc.created_at,
        url=f"/documents/{doc.id}/download",
    )


@router.post("/by-asset/{asset_type}/{asset_id}", response_model=schemas.DocumentOut)
async def upload_document(
    asset_type: str,
    asset_id: int,
    file: UploadFile = File(...),
    doc_type: str = Form("document"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if doc_type not in ("bill", "photo", "document"):
        doc_type = "document"

    _assert_asset_owned(db, asset_type, asset_id, current_user.id)

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 10MB)")

    user_dir = UPLOAD_ROOT / str(current_user.id)
    user_dir.mkdir(parents=True, exist_ok=True)

    extension = Path(file.filename or "").suffix
    stored_filename = f"{uuid.uuid4().hex}{extension}"
    (user_dir / stored_filename).write_bytes(contents)

    doc = models.Document(
        user_id=current_user.id,
        asset_type=asset_type,
        asset_id=asset_id,
        original_filename=file.filename or stored_filename,
        stored_filename=stored_filename,
        content_type=file.content_type,
        doc_type=doc_type,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return _to_out(doc)


@router.get("/by-asset/{asset_type}/{asset_id}", response_model=list[schemas.DocumentOut])
def list_documents(
    asset_type: str,
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _assert_asset_owned(db, asset_type, asset_id, current_user.id)
    docs = (
        db.query(models.Document)
        .filter(
            models.Document.asset_type == asset_type,
            models.Document.asset_id == asset_id,
            models.Document.user_id == current_user.id,
        )
        .all()
    )
    return [_to_out(d) for d in docs]


@router.get("/{document_id}/download")
def download_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    doc = _get_owned_document(db, document_id, current_user.id)
    file_path = UPLOAD_ROOT / str(current_user.id) / doc.stored_filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File missing on disk")
    return FileResponse(
        path=file_path,
        filename=doc.original_filename,
        media_type=doc.content_type or "application/octet-stream",
    )


@router.delete("/{document_id}", status_code=204)
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    doc = _get_owned_document(db, document_id, current_user.id)
    file_path = UPLOAD_ROOT / str(current_user.id) / doc.stored_filename
    file_path.unlink(missing_ok=True)
    db.delete(doc)
    db.commit()


def _get_owned_document(db: Session, document_id: int, user_id: int) -> models.Document:
    doc = (
        db.query(models.Document)
        .filter(models.Document.id == document_id, models.Document.user_id == user_id)
        .first()
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc
