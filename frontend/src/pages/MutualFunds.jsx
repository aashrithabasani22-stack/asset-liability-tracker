import { useEffect, useRef, useState } from "react";
import apiClient from "../api/client";

const SUBTYPES = ["Mutual Fund", "Stock", "ETF", "Index Fund", "Other"];

const emptyForm = {
  fund_name: "", asset_subtype: "Mutual Fund",
  units: "", nav_per_unit: "", current_value: "",
  purchase_price: "", scheme_code: "", ticker_symbol: "",
  owner_name: "",
};

function fmt(n) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);
}

function GainBadge({ current, invested }) {
  if (!invested || invested <= 0) return null;
  const pct = ((current - invested) / invested) * 100;
  const pos = pct >= 0;
  return (
    <span className={`gain-badge ${pos ? "gain-pos" : "gain-neg"}`}>
      {pos ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

// Search Indian MFs by name using mfapi.in
function FundSearch({ onSelect }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);

  function search(val) {
    setQ(val);
    clearTimeout(timer.current);
    if (val.length < 3) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(val)}`);
        const data = await r.json();
        setResults((data || []).slice(0, 8));
      } catch { setResults([]); }
      setLoading(false);
    }, 400);
  }

  return (
    <div className="fund-search">
      <input
        className="input"
        placeholder="Search Indian MF by name (e.g. HDFC Nifty 50)…"
        value={q}
        onChange={(e) => search(e.target.value)}
      />
      {loading && <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Searching…</p>}
      {results.length > 0 && (
        <ul className="fund-search-results">
          {results.map((f) => (
            <li key={f.schemeCode} onClick={() => { onSelect(f); setResults([]); setQ(""); }}>
              <span className="fund-result-name">{f.schemeName}</span>
              <span className="fund-result-code">Code: {f.schemeCode}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Fetch live NAV for a single MF scheme code
function useLiveNav(schemeCode) {
  const [nav, setNav] = useState(null);
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  useEffect(() => {
    if (!schemeCode) return;
    fetch(`https://api.mfapi.in/mf/${schemeCode}`)
      .then((r) => r.json())
      .then((d) => {
        const latest = d.data?.[0];
        if (latest) { setNav(parseFloat(latest.nav)); setDate(latest.date); }
        if (d.meta?.scheme_name) setName(d.meta.scheme_name);
      })
      .catch(() => {});
  }, [schemeCode]);
  return { nav, date, name };
}

// Row with live price fetching
function InvestmentRow({ item, onEdit, onDelete, onSync }) {
  const isMF = item.scheme_code && !item.ticker_symbol;
  const isStock = !!item.ticker_symbol;

  const { nav: liveNav, date: navDate } = useLiveNav(isMF ? item.scheme_code : null);
  const [stockPrice, setStockPrice] = useState(null);
  const [stockLoading, setStockLoading] = useState(false);

  useEffect(() => {
    if (!isStock) return;
    setStockLoading(true);
    apiClient.get(`/market/stock/${item.ticker_symbol}`)
      .then((r) => setStockPrice(r.data.price))
      .catch(() => {})
      .finally(() => setStockLoading(false));
  }, [item.ticker_symbol]);

  const livePrice = isMF ? liveNav : isStock ? stockPrice : null;
  const liveValue = livePrice != null ? livePrice * item.units : null;

  return (
    <tr>
      <td>
        <div style={{ fontWeight: 600 }}>{item.fund_name}</div>
        {item.scheme_code && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Code: {item.scheme_code}</div>}
        {item.ticker_symbol && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Ticker: {item.ticker_symbol}</div>}
      </td>
      <td>{item.asset_subtype || "—"}</td>
      <td>{item.units}</td>
      <td>
        {livePrice != null ? (
          <span>
            {fmt(livePrice)}
            {(isMF && navDate) && <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>{navDate}</span>}
            {isStock && stockLoading && <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}> loading…</span>}
          </span>
        ) : (
          <span style={{ color: "var(--text-muted)" }}>
            {fmt(item.nav_per_unit)}
            {(isMF || isStock) && <span style={{ fontSize: "0.72rem", display: "block" }}>stored</span>}
          </span>
        )}
      </td>
      <td>
        {liveValue != null ? (
          <span style={{ fontWeight: 600, color: "var(--accent)" }}>{fmt(liveValue)}</span>
        ) : (
          fmt(item.current_value)
        )}
        {liveValue != null && Math.abs(liveValue - item.current_value) > 1 && (
          <button
            className="sync-btn"
            onClick={() => onSync(item, livePrice, liveValue)}
            title="Update stored value with live price"
          >↑ Sync</button>
        )}
      </td>
      <td>
        {fmt(item.current_value)}
        <GainBadge current={item.current_value} invested={item.purchase_price} />
      </td>
      <td>{item.owner_name || "—"}</td>
      <td>
        <button className="action-btn" onClick={() => onEdit(item)}>Edit</button>
        <button className="action-btn action-btn-danger" onClick={() => onDelete(item.id)}>Delete</button>
      </td>
    </tr>
  );
}

export default function MutualFunds() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  function load() {
    setLoading(true);
    apiClient.get("/mutual-funds")
      .then((r) => setItems(r.data))
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function openAdd() { setEditing(null); setForm(emptyForm); setShowForm(true); setMsg(""); }
  function openEdit(item) {
    setEditing(item);
    setForm({
      fund_name: item.fund_name,
      asset_subtype: item.asset_subtype || "Mutual Fund",
      units: item.units,
      nav_per_unit: item.nav_per_unit,
      current_value: item.current_value,
      purchase_price: item.purchase_price ?? "",
      scheme_code: item.scheme_code ?? "",
      ticker_symbol: item.ticker_symbol ?? "",
      owner_name: item.owner_name ?? "",
    });
    setShowForm(true);
    setMsg("");
  }

  function cancel() { setShowForm(false); setEditing(null); setMsg(""); }

  function handleFundSelect(fund) {
    setForm((f) => ({
      ...f,
      fund_name: fund.schemeName,
      scheme_code: String(fund.schemeCode),
      asset_subtype: "Mutual Fund",
      ticker_symbol: "",
    }));
  }

  function field(name, val) {
    setForm((f) => {
      const next = { ...f, [name]: val };
      // Auto-compute current_value from units × nav when both present
      if (name === "units" || name === "nav_per_unit") {
        const u = parseFloat(name === "units" ? val : next.units);
        const n = parseFloat(name === "nav_per_unit" ? val : next.nav_per_unit);
        if (!isNaN(u) && !isNaN(n)) next.current_value = (u * n).toFixed(2);
      }
      return next;
    });
  }

  async function save() {
    setSaving(true);
    const payload = {
      ...form,
      units: parseFloat(form.units) || 0,
      nav_per_unit: parseFloat(form.nav_per_unit) || 0,
      current_value: parseFloat(form.current_value) || 0,
      purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
      scheme_code: form.scheme_code || null,
      ticker_symbol: form.ticker_symbol || null,
    };
    try {
      if (editing) await apiClient.put(`/mutual-funds/${editing.id}`, payload);
      else await apiClient.post("/mutual-funds", payload);
      setMsg("Saved!");
      load();
      cancel();
    } catch {
      setMsg("Error saving.");
    }
    setSaving(false);
  }

  async function remove(id) {
    if (!confirm("Delete this entry?")) return;
    await apiClient.delete(`/mutual-funds/${id}`);
    load();
  }

  async function sync(item, livePrice, liveValue) {
    await apiClient.put(`/mutual-funds/${item.id}`, {
      ...item,
      nav_per_unit: livePrice,
      current_value: liveValue,
    });
    load();
  }

  const totalCurrent = items.reduce((s, i) => s + i.current_value, 0);
  const totalInvested = items.reduce((s, i) => s + (i.purchase_price || 0), 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
        <h1 style={{ margin: 0 }}>Mutual Funds & Stocks</h1>
        <button className="add-btn" onClick={openAdd}>+ Add</button>
      </div>

      {totalInvested > 0 && (
        <div className="card-grid" style={{ marginTop: "1rem" }}>
          <div className="card card-accent">
            <h3>Portfolio Value</h3>
            <p className="big-number">{fmt(totalCurrent)}</p>
          </div>
          <div className="card">
            <h3>Amount Invested</h3>
            <p className="big-number">{fmt(totalInvested)}</p>
          </div>
          <div className="card">
            <h3>Total Gain / Loss</h3>
            <p className={`big-number ${totalCurrent >= totalInvested ? "positive" : "negative"}`}>
              {fmt(totalCurrent - totalInvested)}
              <GainBadge current={totalCurrent} invested={totalInvested} />
            </p>
          </div>
        </div>
      )}

      {showForm && (
        <div className="card" style={{ marginTop: "1.2rem" }}>
          <h2>{editing ? "Edit" : "Add"} Investment</h2>

          {!editing && (
            <div style={{ marginBottom: "1rem" }}>
              <label className="field-label">Search Indian MF (optional)</label>
              <FundSearch onSelect={handleFundSelect} />
            </div>
          )}

          <div className="form-grid">
            <div className="form-field">
              <label className="field-label">Fund / Stock Name *</label>
              <input className="input" value={form.fund_name} onChange={(e) => field("fund_name", e.target.value)} />
            </div>
            <div className="form-field">
              <label className="field-label">Type</label>
              <select className="input" value={form.asset_subtype} onChange={(e) => field("asset_subtype", e.target.value)}>
                {SUBTYPES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="field-label">AMFI Scheme Code (for Indian MFs)</label>
              <input className="input" placeholder="e.g. 120503" value={form.scheme_code}
                onChange={(e) => { field("scheme_code", e.target.value); if (e.target.value) field("ticker_symbol", ""); }} />
            </div>
            <div className="form-field">
              <label className="field-label">Yahoo Finance Ticker (for stocks)</label>
              <input className="input" placeholder="e.g. RELIANCE.NS or AAPL" value={form.ticker_symbol}
                onChange={(e) => { field("ticker_symbol", e.target.value); if (e.target.value) field("scheme_code", ""); }} />
            </div>
            <div className="form-field">
              <label className="field-label">Units *</label>
              <input className="input" type="number" step="any" value={form.units} onChange={(e) => field("units", e.target.value)} />
            </div>
            <div className="form-field">
              <label className="field-label">NAV / Price per Unit (₹) *</label>
              <input className="input" type="number" step="any" value={form.nav_per_unit} onChange={(e) => field("nav_per_unit", e.target.value)} />
            </div>
            <div className="form-field">
              <label className="field-label">Current Value (₹) *</label>
              <input className="input" type="number" step="any" value={form.current_value} onChange={(e) => field("current_value", e.target.value)} />
            </div>
            <div className="form-field">
              <label className="field-label">Amount Invested (₹)</label>
              <input className="input" type="number" step="any" value={form.purchase_price} onChange={(e) => field("purchase_price", e.target.value)} />
            </div>
            <div className="form-field">
              <label className="field-label">Owner</label>
              <input className="input" value={form.owner_name} onChange={(e) => field("owner_name", e.target.value)} />
            </div>
          </div>

          {msg && <p style={{ color: msg.startsWith("Error") ? "#ef4444" : "#10b981", marginTop: "0.5rem" }}>{msg}</p>}
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
            <button className="add-btn" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            <button className="cancel-btn" onClick={cancel}>Cancel</button>
          </div>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      {loading ? <p>Loading…</p> : items.length === 0 ? (
        <p style={{ color: "var(--text-muted)", marginTop: "1rem" }}>No investments added yet. Click + Add to get started.</p>
      ) : (
        <div className="table-scroll card" style={{ marginTop: "1.2rem" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Fund / Stock</th>
                <th>Type</th>
                <th>Units</th>
                <th>Live Price</th>
                <th>Live Value</th>
                <th>Stored Value</th>
                <th>Owner</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <InvestmentRow key={item.id} item={item} onEdit={openEdit} onDelete={remove} onSync={sync} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
