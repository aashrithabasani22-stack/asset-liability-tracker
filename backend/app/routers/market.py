import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/market", tags=["market"])


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
