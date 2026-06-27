"""Fetches live gold/silver USD spot prices and converts to INR per gram, with a static fallback."""
import httpx

FALLBACK_GOLD_RATE_PER_GRAM_24K = 7500.0
FALLBACK_SILVER_RATE_PER_GRAM = 95.0

USD_TO_INR = 87.0
GRAMS_PER_TROY_OUNCE = 31.1035

GOLD_API_URL = "https://api.gold-api.com/price/XAU"
SILVER_API_URL = "https://api.gold-api.com/price/XAG"


def get_gold_silver_rates() -> tuple[float, float]:
    try:
        with httpx.Client(timeout=3) as client:
            gold_response = client.get(GOLD_API_URL)
            gold_response.raise_for_status()
            silver_response = client.get(SILVER_API_URL)
            silver_response.raise_for_status()

        gold_usd_per_oz = float(gold_response.json()["price"])
        silver_usd_per_oz = float(silver_response.json()["price"])

        gold_inr_per_gram = (gold_usd_per_oz * USD_TO_INR) / GRAMS_PER_TROY_OUNCE
        silver_inr_per_gram = (silver_usd_per_oz * USD_TO_INR) / GRAMS_PER_TROY_OUNCE
        return gold_inr_per_gram, silver_inr_per_gram
    except Exception:
        return FALLBACK_GOLD_RATE_PER_GRAM_24K, FALLBACK_SILVER_RATE_PER_GRAM
