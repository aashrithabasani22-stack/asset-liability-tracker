import { useEffect, useState } from "react";
import apiClient from "../api/client";

const CATEGORIES = ["Emergency Fund", "Retirement", "Home", "Car", "Travel", "Education", "Wedding", "Investment", "Other"];

const emptyForm = { name: "", target_amount: "", current_amount: "0", deadline: "", category: "Emergency Fund", notes: "" };

const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function daysLeft(deadline) {
  if (!deadline) return null;
  const diff = Math.ceil((new Date(deadline) - new Date()) / 86400000);
  return diff;
}

function GoalCard({ goal, onEdit, onDelete, onAddFunds }) {
  const pct = Math.min(100, goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0);
  const days = daysLeft(goal.deadline);
  const done = pct >= 100;
  const overdue = days !== null && days < 0 && !done;

  return (
    <div className={`goal-card card ${done ? "goal-done" : overdue ? "goal-overdue" : ""}`}>
      <div className="goal-header">
        <div>
          <span className="goal-category">{goal.category || "Goal"}</span>
          <h3 className="goal-name">{goal.name}</h3>
        </div>
        <div className="goal-actions">
          <button className="action-btn" onClick={() => onEdit(goal)}>Edit</button>
          <button className="action-btn action-btn-danger" onClick={() => onDelete(goal.id)}>Delete</button>
        </div>
      </div>

      <div className="goal-amounts">
        <span className="goal-current">{fmt.format(goal.current_amount)}</span>
        <span className="goal-separator"> / </span>
        <span className="goal-target">{fmt.format(goal.target_amount)}</span>
      </div>

      <div className="goal-bar-track">
        <div
          className={`goal-bar-fill ${done ? "goal-bar-done" : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="goal-meta">
        <span className={`goal-pct ${done ? "goal-pct-done" : ""}`}>{pct.toFixed(1)}% saved</span>
        {done && <span className="goal-achieved">Goal achieved!</span>}
        {!done && goal.target_amount > goal.current_amount && (
          <span className="goal-remaining">{fmt.format(goal.target_amount - goal.current_amount)} to go</span>
        )}
        {days !== null && !done && (
          <span className={`goal-deadline ${overdue ? "goal-overdue-text" : days <= 30 ? "goal-soon" : ""}`}>
            {overdue ? `${Math.abs(days)}d overdue` : days === 0 ? "Due today" : `${days}d left`}
          </span>
        )}
      </div>

      {goal.notes && <p className="goal-notes">{goal.notes}</p>}

      {!done && (
        <button className="goal-add-btn" onClick={() => onAddFunds(goal)}>+ Add Funds</button>
      )}
    </div>
  );
}

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [addFundsGoal, setAddFundsGoal] = useState(null);
  const [addAmount, setAddAmount] = useState("");

  function load() {
    setLoading(true);
    apiClient.get("/goals")
      .then((r) => setGoals(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function openAdd() { setEditing(null); setForm(emptyForm); setShowForm(true); setMsg(""); }
  function openEdit(goal) {
    setEditing(goal);
    setForm({
      name: goal.name,
      target_amount: goal.target_amount,
      current_amount: goal.current_amount,
      deadline: goal.deadline ?? "",
      category: goal.category ?? "Other",
      notes: goal.notes ?? "",
    });
    setShowForm(true);
    setMsg("");
  }
  function cancel() { setShowForm(false); setEditing(null); setMsg(""); }

  function field(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function save() {
    if (!form.name || !form.target_amount) { setMsg("Name and target amount are required."); return; }
    setSaving(true);
    const payload = {
      ...form,
      target_amount: parseFloat(form.target_amount),
      current_amount: parseFloat(form.current_amount) || 0,
      deadline: form.deadline || null,
      category: form.category || null,
      notes: form.notes || null,
    };
    try {
      if (editing) await apiClient.put(`/goals/${editing.id}`, payload);
      else await apiClient.post("/goals", payload);
      load();
      cancel();
    } catch { setMsg("Error saving."); }
    setSaving(false);
  }

  async function remove(id) {
    if (!confirm("Delete this goal?")) return;
    await apiClient.delete(`/goals/${id}`);
    load();
  }

  async function applyAddFunds() {
    const amount = parseFloat(addAmount);
    if (!amount || amount <= 0) return;
    const g = addFundsGoal;
    await apiClient.put(`/goals/${g.id}`, {
      name: g.name, target_amount: g.target_amount,
      current_amount: Math.min(g.target_amount, g.current_amount + amount),
      deadline: g.deadline, category: g.category, notes: g.notes,
    });
    setAddFundsGoal(null);
    setAddAmount("");
    load();
  }

  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0);
  const totalSaved = goals.reduce((s, g) => s + g.current_amount, 0);
  const achieved = goals.filter((g) => g.current_amount >= g.target_amount).length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
        <h1 style={{ margin: 0 }}>Savings Goals</h1>
        <button className="add-btn" onClick={openAdd}>+ New Goal</button>
      </div>

      {goals.length > 0 && (
        <div className="card-grid" style={{ marginTop: "1rem" }}>
          <div className="card card-accent">
            <h3>Total Saved</h3>
            <p className="big-number">{fmt.format(totalSaved)}</p>
          </div>
          <div className="card">
            <h3>Total Target</h3>
            <p className="big-number">{fmt.format(totalTarget)}</p>
          </div>
          <div className="card">
            <h3>Goals Achieved</h3>
            <p className="big-number">{achieved} / {goals.length}</p>
          </div>
        </div>
      )}

      {showForm && (
        <div className="card" style={{ marginTop: "1.2rem" }}>
          <h2>{editing ? "Edit Goal" : "New Savings Goal"}</h2>
          <div className="form-grid">
            <div className="form-field">
              <label className="field-label">Goal Name *</label>
              <input className="input" placeholder="e.g. Emergency Fund" value={form.name} onChange={(e) => field("name", e.target.value)} />
            </div>
            <div className="form-field">
              <label className="field-label">Category</label>
              <select className="input" value={form.category} onChange={(e) => field("category", e.target.value)}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="field-label">Target Amount (₹) *</label>
              <input className="input" type="number" step="any" placeholder="500000" value={form.target_amount} onChange={(e) => field("target_amount", e.target.value)} />
            </div>
            <div className="form-field">
              <label className="field-label">Already Saved (₹)</label>
              <input className="input" type="number" step="any" value={form.current_amount} onChange={(e) => field("current_amount", e.target.value)} />
            </div>
            <div className="form-field">
              <label className="field-label">Target Date</label>
              <input className="input" type="date" value={form.deadline} onChange={(e) => field("deadline", e.target.value)} />
            </div>
            <div className="form-field" style={{ gridColumn: "1 / -1" }}>
              <label className="field-label">Notes</label>
              <input className="input" placeholder="Optional notes…" value={form.notes} onChange={(e) => field("notes", e.target.value)} />
            </div>
          </div>
          {msg && <p style={{ color: msg.startsWith("Error") ? "#ef4444" : "#10b981", marginTop: "0.5rem" }}>{msg}</p>}
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
            <button className="add-btn" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
            <button className="cancel-btn" onClick={cancel}>Cancel</button>
          </div>
        </div>
      )}

      {addFundsGoal && (
        <div className="modal-overlay" onClick={() => setAddFundsGoal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>Add Funds — {addFundsGoal.name}</h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
              Saved: {fmt.format(addFundsGoal.current_amount)} / {fmt.format(addFundsGoal.target_amount)}
            </p>
            <input
              className="input"
              type="number"
              step="any"
              placeholder="Amount to add (₹)"
              value={addAmount}
              onChange={(e) => setAddAmount(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && applyAddFunds()}
            />
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
              <button className="add-btn" onClick={applyAddFunds}>Add</button>
              <button className="cancel-btn" onClick={() => { setAddFundsGoal(null); setAddAmount(""); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <p>Loading…</p> : goals.length === 0 && !showForm ? (
        <div className="card" style={{ marginTop: "1.5rem", textAlign: "center", padding: "2.5rem" }}>
          <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🎯</p>
          <p style={{ color: "var(--text-muted)" }}>No savings goals yet. Create one to start tracking your progress.</p>
        </div>
      ) : (
        <div className="goals-grid">
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g} onEdit={openEdit} onDelete={remove} onAddFunds={(g) => { setAddFundsGoal(g); setAddAmount(""); }} />
          ))}
        </div>
      )}
    </div>
  );
}
