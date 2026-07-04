from datetime import datetime

from pydantic import BaseModel, EmailStr, ConfigDict


# --- Auth ---
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# --- Property ---
class PropertyBase(BaseModel):
    address: str
    property_type: str
    current_value: float
    owner_name: str | None = None


class PropertyCreate(PropertyBase):
    pass


class PropertyOut(PropertyBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


# --- Gold ---
class GoldAssetBase(BaseModel):
    article_name: str
    weight_grams: float
    purity_karat: float = 24
    owner_name: str | None = None


class GoldAssetCreate(GoldAssetBase):
    pass


class GoldAssetOut(GoldAssetBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


# --- Silver ---
class SilverAssetBase(BaseModel):
    article_name: str
    weight_grams: float
    purity_percent: float = 99.9
    owner_name: str | None = None


class SilverAssetCreate(SilverAssetBase):
    pass


class SilverAssetOut(SilverAssetBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


# --- Loan ---
class LoanBase(BaseModel):
    bank_name: str
    loan_type: str
    remaining_balance: float
    monthly_payment: float


class LoanCreate(LoanBase):
    pass


class LoanOut(LoanBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


# --- Document ---
class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    asset_type: str
    asset_id: int
    original_filename: str
    content_type: str | None
    doc_type: str
    created_at: datetime
    url: str


# --- Dashboard ---
class DashboardSummary(BaseModel):
    total_real_estate_value: float
    total_gold_value: float
    total_silver_value: float
    total_assets: float
    total_liabilities: float
    net_worth: float
    gold_rate_per_gram_24k: float
    silver_rate_per_gram: float
    platinum_rate_per_gram: float
