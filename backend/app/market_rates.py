"""Fetches live gold/silver/platinum USD spot prices and converts to INR per gram."""
import httpx

FALLBACK_GOLD_RATE_PER_GRAM_24K = 7500.0
FALLBACK_SILVER_RATE_PER_GRAM = 95.0
FALLBACK_PLATINUM_RATE_PER_GRAM = 2900.0

USD_TO_INR = 87.0
GRAMS_PER_TROY_OUNCE = 31.1035

BASE_URL = "https://api.gold-api.com/price"


def _fetch_inr_per_gram(client: httpx.Client, symbol: str) -> float:
    res = client.get(f"{BASE_URL}/{symbol}")
    res.raise_for_status()
    usd_per_oz = float(res.json()["price"])
    return (usd_per_oz * USD_TO_INR) / GRAMS_PER_TROY_OUNCE


def get_all_rates() -> tuple[float, float, float]:
    """Returns (gold_inr_per_gram_24k, silver_inr_per_gram, platinum_inr_per_gram)."""
    try:
        with httpx.Client(timeout=5) as client:
            gold = _fetch_inr_per_gram(client, "XAU")
            silver = _fetch_inr_per_gram(client, "XAG")
            platinum = _fetch_inr_per_gram(client, "XPT")
        return gold, silver, platinum
    except Exception:
        return FALLBACK_GOLD_RATE_PER_GRAM_24K, FALLBACK_SILVER_RATE_PER_GRAM, FALLBACK_PLATINUM_RATE_PER_GRAM


def get_gold_silver_rates() -> tuple[float, float]:
    gold, silver, _ = get_all_rates()
    return gold, silver
