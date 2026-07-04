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
    principal_amount: float
    remaining_balance: float
    monthly_payment: float
    payment_bank: str | None = None
    next_due_date: str | None = None


class LoanCreate(LoanBase):
    pass


class LoanOut(LoanBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


# --- Bank Account ---
class BankAccountBase(BaseModel):
    bank_name: str
    account_number: str | None = None
    account_type: str | None = None
    balance: float
    owner_name: str | None = None

class BankAccountCreate(BankAccountBase):
    pass

class BankAccountOut(BankAccountBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime


# --- Credit Card ---
class CreditCardBase(BaseModel):
    bank_name: str
    card_name: str | None = None
    credit_limit: float
    outstanding_amount: float
    due_date: str | None = None
    owner_name: str | None = None

class CreditCardCreate(CreditCardBase):
    pass

class CreditCardOut(CreditCardBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime


# --- Profile update ---
class ProfileUpdate(BaseModel):
    name: str
    email: EmailStr

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

# --- Fixed Deposit ---
class FixedDepositBase(BaseModel):
    bank_name: str
    principal_amount: float
    interest_rate: float
    start_date: str | None = None
    maturity_date: str | None = None
    maturity_value: float
    owner_name: str | None = None

class FixedDepositCreate(FixedDepositBase):
    pass

class FixedDepositOut(FixedDepositBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime


# --- Mutual Fund / Stock ---
class MutualFundBase(BaseModel):
    fund_name: str
    asset_subtype: str | None = None
    units: float
    nav_per_unit: float
    current_value: float
    owner_name: str | None = None

class MutualFundCreate(MutualFundBase):
    pass

class MutualFundOut(MutualFundBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime


# --- Vehicle ---
class VehicleBase(BaseModel):
    name: str
    vehicle_type: str | None = None
    registration_number: str | None = None
    current_value: float
    owner_name: str | None = None

class VehicleCreate(VehicleBase):
    pass

class VehicleOut(VehicleBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime


# --- Other Asset ---
class OtherAssetBase(BaseModel):
    name: str
    category: str | None = None
    current_value: float
    notes: str | None = None
    owner_name: str | None = None

class OtherAssetCreate(OtherAssetBase):
    pass

class OtherAssetOut(OtherAssetBase):
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


# --- Family ---
class FamilyGroupCreate(BaseModel):
    name: str

class FamilyMemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    name: str
    email: str
    joined_at: datetime

class FamilyGroupOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    owner_id: int
    invite_code: str
    members: list[FamilyMemberOut]
    created_at: datetime

class FamilyMemberSummary(BaseModel):
    user_id: int
    name: str
    email: str
    net_worth: float
    total_assets: float
    total_liabilities: float

class FamilyDashboard(BaseModel):
    group_name: str
    members: list[FamilyMemberSummary]
    combined_net_worth: float
    combined_assets: float
    combined_liabilities: float


# --- Dashboard ---
class DashboardSummary(BaseModel):
    total_real_estate_value: float
    total_gold_value: float
    total_silver_value: float
    total_fd_value: float
    total_mf_value: float
    total_vehicle_value: float
    total_other_value: float
    total_bank_balance: float
    total_assets: float
    total_credit_card_outstanding: float
    total_liabilities: float
    net_worth: float
    gold_rate_per_gram_24k: float
    silver_rate_per_gram: float
    platinum_rate_per_gram: float
