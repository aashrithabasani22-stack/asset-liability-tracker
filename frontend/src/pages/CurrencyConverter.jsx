import { useEffect, useState } from "react";

const CURRENCIES = [
  { code: "INR", label: "INR – Indian Rupee" },
  { code: "USD", label: "USD – US Dollar" },
  { code: "EUR", label: "EUR – Euro" },
  { code: "GBP", label: "GBP – British Pound" },
  { code: "AED", label: "AED – UAE Dirham" },
  { code: "SGD", label: "SGD – Singapore Dollar" },
  { code: "AUD", label: "AUD – Australian Dollar" },
  { code: "CAD", label: "CAD – Canadian Dollar" },
  { code: "JPY", label: "JPY – Japanese Yen" },
  { code: "CHF", label: "CHF – Swiss Franc" },
  { code: "CNY", label: "CNY – Chinese Yuan" },
  { code: "SAR", label: "SAR – Saudi Riyal" },
  { code: "QAR", label: "QAR – Qatari Riyal" },
  { code: "MYR", label: "MYR – Malaysian Ringgit" },
  { code: "HKD", label: "HKD – Hong Kong Dollar" },
];

export default function CurrencyConverter() {
  const [amount, setAmount] = useState("1");
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("INR");
  const [result, setResult] = useState(null);
  const [rate, setRate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  async function convert() {
    const num = parseFloat(amount);
    if (!num || num <= 0) return;
    if (from === to) { setRate(1); setResult(num); return; }

    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `https://api.frankfurter.app/latest?from=${from}&to=${to}`
      );
      if (!res.ok) throw new Error("Rate fetch failed");
      const data = await res.json();
      const r = data.rates[to];
      setRate(r);
      setResult(num * r);
      setLastUpdated(data.date);
    } catch {
      setError("Could not fetch live rate. Please try again.");
    }
    setLoading(false);
  }

  useEffect(() => { convert(); }, [from, to]);

  function swap() {
    setFrom(to);
    setTo(from);
    setResult(null);
    setRate(null);
  }

  const fmt = (val, currency) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 4,
    }).format(val);

  return (
    <div>
      <h1>Currency Converter</h1>
      <div className="converter-card card">
        <div className="converter-row">
          <div className="converter-field">
            <label className="converter-label">Amount</label>
            <input
              className="converter-input"
              type="number"
              min="0"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onBlur={convert}
              onKeyDown={(e) => e.key === "Enter" && convert()}
            />
          </div>

          <div className="converter-field">
            <label className="converter-label">From</label>
            <select
              className="converter-select"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>

          <button className="swap-btn" onClick={swap} title="Swap currencies">⇄</button>

          <div className="converter-field">
            <label className="converter-label">To</label>
            <select
              className="converter-select"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          </div>

          <button className="converter-btn" onClick={convert} disabled={loading}>
            {loading ? "..." : "Convert"}
          </button>
        </div>

        {error && <p className="error" style={{ marginTop: "1rem" }}>{error}</p>}

        {result !== null && !error && (
          <div className="converter-result">
            <div className="result-main">
              <span className="result-from">{fmt(parseFloat(amount) || 0, from)}</span>
              <span className="result-equals">=</span>
              <span className="result-to">{fmt(result, to)}</span>
            </div>
            {rate !== null && (
              <div className="result-rate">
                1 {from} = {rate} {to}
                {lastUpdated && <span className="result-date"> · Rate as of {lastUpdated}</span>}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="converter-quick-ref card" style={{ marginTop: "1.2rem" }}>
        <h2 style={{ marginTop: 0 }}>Quick Reference — 1 USD in major currencies</h2>
        <QuickRates />
      </div>
    </div>
  );
}

function QuickRates() {
  const [rates, setRates] = useState(null);
  const [date, setDate] = useState("");

  useEffect(() => {
    fetch("https://api.frankfurter.app/latest?from=USD&to=INR,EUR,GBP,AED,SGD,AUD,JPY,SAR")
      .then((r) => r.json())
      .then((data) => { setRates(data.rates); setDate(data.date); })
      .catch(() => {});
  }, []);

  if (!rates) return <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Loading rates…</p>;

  return (
    <>
      <table className="data-table rates-table">
        <thead><tr><th>Currency</th><th>Rate (1 USD)</th></tr></thead>
        <tbody>
          {Object.entries(rates).map(([code, val]) => (
            <tr key={code}>
              <td>{CURRENCIES.find((c) => c.code === code)?.label || code}</td>
              <td className="rate-value">{val}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
        Source: frankfurter.app · {date}
      </p>
    </>
  );
}
