import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/market", tags=["market"])

FX_CODES = "INR,USD,GBP,SGD,AUD,CAD,JPY,CHF,MYR"


@router.get("/fx")
async def get_fx_rates():
    """Proxy frankfurter.dev — returns all rates relative to INR (1 INR = X currency)."""
    url = f"https://api.frankfurter.dev/v1/latest?from=EUR&to={FX_CODES}"
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(url)
            r.raise_for_status()
            data = r.json()
        eur_to_inr = data["rates"]["INR"]
        rates = {"INR": 1.0, "EUR": round(1 / eur_to_inr, 8)}
        for code, eur_rate in data["rates"].items():
            if code != "INR":
                rates[code] = round(eur_rate / eur_to_inr, 8)
        return {"rates": rates, "date": data["date"]}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"FX fetch failed: {e}")


@router.get("/stock/{symbol}")
async def get_stock_price(symbol: str):
    """Proxy Yahoo Finance to get a live stock/ETF price."""
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
    params = {"interval": "1d", "range": "1d"}
    headers = {"User-Agent": "Mozilla/5.0"}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(url, params=params, headers=headers)
            r.raise_for_status()
            data = r.json()
        result = data["chart"]["result"][0]
        meta = result["meta"]
        price = meta.get("regularMarketPrice") or meta.get("previousClose", 0)
        return {
            "symbol": symbol,
            "price": price,
            "currency": meta.get("currency", "INR"),
            "name": meta.get("longName") or meta.get("shortName") or symbol,
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not fetch price for {symbol}: {e}")
