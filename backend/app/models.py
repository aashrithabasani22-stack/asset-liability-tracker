from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    properties = relationship("Property", back_populates="owner", cascade="all, delete-orphan")
    gold_assets = relationship("GoldAsset", back_populates="owner", cascade="all, delete-orphan")
    silver_assets = relationship("SilverAsset", back_populates="owner", cascade="all, delete-orphan")
    loans = relationship("Loan", back_populates="owner", cascade="all, delete-orphan")


class Property(Base):
    __tablename__ = "properties"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    address = Column(String, nullable=False)
    property_type = Column(String, nullable=False)
    current_value = Column(Float, nullable=False, default=0)
    owner_name = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    owner = relationship("User", back_populates="properties")


class GoldAsset(Base):
    __tablename__ = "gold_assets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    article_name = Column(String, nullable=False)
    weight_grams = Column(Float, nullable=False)
    purity_karat = Column(Float, nullable=False, default=24)
    owner_name = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    owner = relationship("User", back_populates="gold_assets")


class SilverAsset(Base):
    __tablename__ = "silver_assets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    article_name = Column(String, nullable=False)
    weight_grams = Column(Float, nullable=False)
    purity_percent = Column(Float, nullable=False, default=99.9)
    owner_name = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    owner = relationship("User", back_populates="silver_assets")


class Loan(Base):
    __tablename__ = "loans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    bank_name = Column(String, nullable=False)
    loan_type = Column(String, nullable=False)
    principal_amount = Column(Float, nullable=False, server_default="0")
    remaining_balance = Column(Float, nullable=False, default=0)
    monthly_payment = Column(Float, nullable=False, default=0)
    payment_bank = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    owner = relationship("User", back_populates="loans")


class FixedDeposit(Base):
    __tablename__ = "fixed_deposits"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    bank_name = Column(String, nullable=False)
    principal_amount = Column(Float, nullable=False, default=0)
    interest_rate = Column(Float, nullable=False, default=0)
    start_date = Column(String, nullable=True)
    maturity_date = Column(String, nullable=True)
    maturity_value = Column(Float, nullable=False, default=0)
    owner_name = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    owner = relationship("User", backref="fixed_deposits")


class MutualFund(Base):
    __tablename__ = "mutual_funds"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    fund_name = Column(String, nullable=False)
    asset_subtype = Column(String, nullable=True)
    units = Column(Float, nullable=False, default=0)
    nav_per_unit = Column(Float, nullable=False, default=0)
    current_value = Column(Float, nullable=False, default=0)
    owner_name = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    owner = relationship("User", backref="mutual_funds")


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    vehicle_type = Column(String, nullable=True)
    registration_number = Column(String, nullable=True)
    current_value = Column(Float, nullable=False, default=0)
    owner_name = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    owner = relationship("User", backref="vehicles")


class OtherAsset(Base):
    __tablename__ = "other_assets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    category = Column(String, nullable=True)
    current_value = Column(Float, nullable=False, default=0)
    notes = Column(String, nullable=True)
    owner_name = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    owner = relationship("User", backref="other_assets")


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    asset_type = Column(String, nullable=False)  # "property" | "gold" | "silver" | "loan"
    asset_id = Column(Integer, nullable=False)
    original_filename = Column(String, nullable=False)
    stored_filename = Column(String, nullable=False)
    content_type = Column(String, nullable=True)
    doc_type = Column(String, nullable=False, server_default="document")
    created_at = Column(DateTime, server_default=func.now())
