import { useEffect, useState } from "react";
import apiClient from "../api/client";

const EXPENSE_CATEGORIES = [
  "Rent/EMI", "Groceries", "Utilities", "Transport", "Healthcare",
  "Education", "Dining", "Shopping", "Entertainment", "Insurance",
  "Investments", "Other",
];

const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function thisMonth() {
  return new Date().toISOString().slice(0, 7);
}

function BudgetRow({ row, onEdit, onDelete }) {
  const over = row.over;
  const pct = row.pct;
  const barColor = over ? "var(--danger)" : pct >= 80 ? "#f59e0b" : "var(--accent)";

  return (
    <div className={`budget-row ${over ? "budget-over" : ""}`}>
      <div className="budget-row-top">
        <span className="budget-category">{row.category}</span>
        <div className="budget-row-actions">
          <button className="action-btn" onClick={() => onEdit(row)}>Edit</button>
          <button className="action-btn action-btn-danger" onClick={() => onDelete(row.category)}>Remove</button>
        </div>
      </div>

      <div className="budget-bar-track">
        <div className="budget-bar-fill" style={{ width: `${pct}%`, background: barColor }} />
      </div>

      <div className="budget-row-meta">
        <span className="budget-spent">
          {fmt.format(row.spent)} spent
          {over && <span className="budget-over-badge"> ▲ {fmt.format(row.spent - row.limit_amount)} over</span>}
        </span>
        <span className="budget-limit">Limit: {fmt.format(row.limit_amount)}</span>
        <span className={`budget-pct ${over ? "budget-pct-over" : pct >= 80 ? "budget-pct-warn" : "budget-pct-ok"}`}>
          {pct.toFixed(0)}%
        </span>
        {!over && <span className="budget-remaining">{fmt.format(row.remaining)} left</span>}
      </div>
    </div>
  );
}

export default function Budget() {
  const [month, setMonth] = useState(thisMonth);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [formCat, setFormCat] = useState(EXPENSE_CATEGORIES[0]);
  const [formLimit, setFormLimit] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  function load(m) {
    setLoading(true);
    apiClient.get(`/budgets/vs-actual/${m}`)
      .then((r) => setRows(r.data))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(month); }, [month]);

  const budgetedCategories = new Set(rows.map((r) => r.category));
  const availableCategories = EXPENSE_CATEGORIES.filter((c) => !budgetedCategories.has(c));

  function openAdd() {
    setEditCat(null);
    setFormCat(availableCategories[0] || EXPENSE_CATEGORIES[0]);
    setFormLimit("");
    setShowForm(true);
    setMsg("");
  }

  function openEdit(row) {
    setEditCat(row.category);
    setFormCat(row.category);
    setFormLimit(row.limit_amount);
    setShowForm(true);
    setMsg("");
  }

  function cancel() { setShowForm(false); setEditCat(null); setMsg(""); }

  async function save() {
    const limit = parseFloat(formLimit);
    if (!formCat || !limit || limit <= 0) { setMsg("Enter a valid category and amount."); return; }
    setSaving(true);
    try {
      await apiClient.put(`/budgets/${month}/${encodeURIComponent(formCat)}`, {
        month, category: formCat, limit_amount: limit,
      });
      load(month);
      cancel();
    } catch { setMsg("Error saving."); }
    setSaving(false);
  }

  async function remove(category) {
    if (!confirm(`Remove budget for "${category}"?`)) return;
    await apiClient.delete(`/budgets/${month}/${encodeURIComponent(category)}`);
    load(month);
  }

  const totalBudget = rows.reduce((s, r) => s + r.limit_amount, 0);
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0);
  const overCount = rows.filter((r) => r.over).length;
  const totalPct = totalBudget > 0 ? Math.min(100, (totalSpent / totalBudget) * 100) : 0;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
        <h1 style={{ margin: 0 }}>Budget Planner</h1>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <input
            type="month"
            className="input"
            style={{ width: "auto" }}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
          <button className="add-btn" onClick={openAdd} disabled={availableCategories.length === 0}>
            + Set Budget
          </button>
        </div>
      </div>

      {rows.length > 0 && (
        <div className="card-grid" style={{ marginTop: "1rem" }}>
          <div className="card card-accent">
            <h3>Total Spent</h3>
            <p className="big-number">{fmt.format(totalSpent)}</p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>
              of {fmt.format(totalBudget)} budgeted ({totalPct.toFixed(0)}%)
            </p>
          </div>
          <div className="card">
            <h3>Remaining</h3>
            <p className={`big-number ${totalSpent > totalBudget ? "negative" : "positive"}`}>
              {fmt.format(Math.max(0, totalBudget - totalSpent))}
            </p>
          </div>
          <div className="card">
            <h3>Categories Over Budget</h3>
            <p className={`big-number ${overCount > 0 ? "negative" : "positive"}`}>
              {overCount} / {rows.length}
            </p>
          </div>
        </div>
      )}

      {showForm && (
        <div className="card" style={{ marginTop: "1.2rem" }}>
          <h2>{editCat ? `Edit — ${editCat}` : "Set Budget Limit"}</h2>
          <div className="form-grid">
            <div className="form-field">
              <label className="field-label">Category</label>
              {editCat ? (
                <input className="input" value={formCat} disabled />
              ) : (
                <select className="input" value={formCat} onChange={(e) => setFormCat(e.target.value)}>
                  {availableCategories.map((c) => <option key={c}>{c}</option>)}
                </select>
              )}
            </div>
            <div className="form-field">
              <label className="field-label">Monthly Limit (₹)</label>
              <input
                className="input"
                type="number"
                step="any"
                placeholder="e.g. 8000"
                value={formLimit}
                onChange={(e) => setFormLimit(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && save()}
                autoFocus
              />
            </div>
          </div>
          {msg && <p style={{ color: "#ef4444", marginTop: "0.5rem" }}>{msg}</p>}
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
            <button className="add-btn" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            <button className="cancel-btn" onClick={cancel}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <p>Loading…</p> : rows.length === 0 && !showForm ? (
        <div className="card" style={{ marginTop: "1.5rem", textAlign: "center", padding: "2.5rem" }}>
          <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📊</p>
          <p style={{ color: "var(--text-muted)" }}>
            No budgets set for {month}. Click <strong>Set Budget</strong> to add spending limits for each category.
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            Spending is pulled automatically from your Transactions.
          </p>
        </div>
      ) : (
        <div className="card" style={{ marginTop: "1.2rem", padding: "1rem 1.2rem" }}>
          <h2 style={{ marginTop: 0, marginBottom: "1rem" }}>
            {new Date(month + "-01").toLocaleString("en-IN", { month: "long", year: "numeric" })}
          </h2>
          <div className="budget-list">
            {rows.map((row) => (
              <BudgetRow key={row.category} row={row} onEdit={openEdit} onDelete={remove} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
