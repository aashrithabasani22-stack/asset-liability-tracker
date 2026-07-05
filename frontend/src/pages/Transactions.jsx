import { useEffect, useMemo, useState } from "react";
import apiClient from "../api/client";

const INCOME_CATEGORIES = ["Salary", "Freelance", "Business", "Rental", "Interest", "Dividends", "Gift", "Other"];
const EXPENSE_CATEGORIES = ["Rent/EMI", "Groceries", "Utilities", "Transport", "Healthcare", "Education", "Dining", "Shopping", "Entertainment", "Insurance", "Investments", "Other"];

const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function emptyForm() {
  return { date: new Date().toISOString().slice(0, 10), type: "expense", category: "Groceries", description: "", amount: "" };
}

export default function Transactions() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState(() => new Date().toISOString().slice(0, 7));
  const [summary, setSummary] = useState(null);

  function load() {
    apiClient.get("/transactions").then((r) => setItems(r.data)).catch(() => {});
  }

  function loadSummary(month) {
    if (!month) { setSummary(null); return; }
    apiClient.get(`/transactions/summary/${month}`).then((r) => setSummary(r.data)).catch(() => setSummary(null));
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { loadSummary(monthFilter); }, [monthFilter]);

  const categories = form.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const editCategories = editForm.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const filtered = useMemo(() => {
    return items.filter((t) => {
      if (typeFilter && t.type !== typeFilter) return false;
      if (monthFilter && !t.date.startsWith(monthFilter)) return false;
      if (search) {
        const q = search.toLowerCase();
        return t.category.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [items, typeFilter, monthFilter, search]);

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    try {
      await apiClient.post("/transactions", { ...form, amount: Number(form.amount) });
      setForm(emptyForm());
      load();
      loadSummary(monthFilter);
    } catch (err) {
      setError(err.response?.data?.detail || "Save failed");
    }
  }

  function startEdit(item) {
    setEditForm({ ...item });
    setEditingId(item.id);
  }

  async function saveEdit(id) {
    try {
      await apiClient.put(`/transactions/${id}`, { ...editForm, amount: Number(editForm.amount) });
      setEditingId(null);
      load();
      loadSummary(monthFilter);
    } catch (err) {
      setError(err.response?.data?.detail || "Update failed");
    }
  }

  async function handleDelete(id) {
    await apiClient.delete(`/transactions/${id}`);
    load();
    loadSummary(monthFilter);
  }

  const savingsPct = summary && summary.total_income > 0
    ? ((summary.net_savings / summary.total_income) * 100).toFixed(0)
    : null;

  return (
    <div>
      <div className="page-header">
        <h1>Transactions</h1>
        <span className="item-count">{filtered.length} of {items.length}</span>
      </div>
      {error && <p className="error">{error}</p>}

      {summary && (
        <div className="card-grid" style={{ marginBottom: "1.5rem" }}>
          <div className="card">
            <h3>Income</h3>
            <p className="big-number positive">{fmt.format(summary.total_income)}</p>
          </div>
          <div className="card">
            <h3>Expenses</h3>
            <p className="big-number negative">{fmt.format(summary.total_expenses)}</p>
          </div>
          <div className="card card-accent">
            <h3>Net Savings</h3>
            <p className={`big-number ${summary.net_savings >= 0 ? "positive" : "negative"}`}>
              {fmt.format(summary.net_savings)}
              {savingsPct !== null && <span style={{ fontSize: "1rem", marginLeft: "0.5rem", opacity: 0.7 }}>({savingsPct}%)</span>}
            </p>
          </div>
          {Object.keys(summary.by_category).length > 0 && (
            <div className="card">
              <h3>Top expense</h3>
              {(() => {
                const top = Object.entries(summary.by_category).sort((a, b) => b[1] - a[1])[0];
                return <p className="big-number" style={{ fontSize: "1.2rem" }}>{top[0]}<br /><span style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>{fmt.format(top[1])}</span></p>;
              })()}
            </div>
          )}
        </div>
      )}

      <form className="crud-form" onSubmit={handleAdd}>
        <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required />
        <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value, category: e.target.value === "income" ? "Salary" : "Groceries" }))}>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="text" placeholder="Description (optional)" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        <input type="number" placeholder="Amount (₹)" step="any" min="0" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
        <button type="submit">Add</button>
      </form>

      <div className="filter-bar">
        <input className="filter-search" type="text" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="filter-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
        <input type="month" className="filter-select" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} />
        {(search || typeFilter) && (
          <button className="filter-clear" onClick={() => { setSearch(""); setTypeFilter(""); }}>✕ Clear</button>
        )}
      </div>

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th>Amount</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="table-empty">No transactions found.</td></tr>
            )}
            {filtered.map((item) => (
              editingId === item.id ? (
                <tr key={item.id} className="editing-row">
                  <td><input className="inline-edit-input" type="date" value={editForm.date} onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))} /></td>
                  <td>
                    <select className="inline-edit-input" value={editForm.type} onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value, category: e.target.value === "income" ? "Salary" : "Groceries" }))}>
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                    </select>
                  </td>
                  <td>
                    <select className="inline-edit-input" value={editForm.category} onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}>
                      {editCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td><input className="inline-edit-input" type="text" value={editForm.description || ""} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} /></td>
                  <td><input className="inline-edit-input" type="number" step="any" value={editForm.amount} onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))} /></td>
                  <td>
                    <button className="btn-save" onClick={() => saveEdit(item.id)}>Save</button>
                    <button className="btn-cancel" onClick={() => setEditingId(null)}>Cancel</button>
                  </td>
                </tr>
              ) : (
                <tr key={item.id}>
                  <td>{item.date}</td>
                  <td><span className={`tx-badge tx-${item.type}`}>{item.type}</span></td>
                  <td>{item.category}</td>
                  <td>{item.description || "—"}</td>
                  <td className={item.type === "income" ? "positive" : "negative"}>{fmt.format(item.amount)}</td>
                  <td>
                    <button onClick={() => startEdit(item)}>Edit</button>
                    <button onClick={() => handleDelete(item.id)}>Delete</button>
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
