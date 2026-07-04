import { useEffect, useState } from "react";
import apiClient from "../api/client";

const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default function Family() {
  const [group, setGroup] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState("");

  function load() {
    setLoading(true);
    setError("");
    apiClient.get("/family/group")
      .then((res) => {
        setGroup(res.data);
        return apiClient.get("/family/dashboard");
      })
      .then((res) => setDashboard(res.data))
      .catch((err) => {
        if (err.response?.status === 404) {
          setGroup(null);
          setDashboard(null);
        } else {
          setError(err.response?.data?.detail || "Failed to load");
        }
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError(""); setMsg("");
    try {
      await apiClient.post("/family/create", { name: groupName });
      setGroupName("");
      setMsg("Family group created!");
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create");
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    setError(""); setMsg("");
    try {
      const res = await apiClient.post("/family/join", { invite_code: inviteCode });
      setInviteCode("");
      setMsg(res.data.detail);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to join");
    }
  }

  async function handleLeave() {
    if (!confirm("Are you sure you want to leave this group?")) return;
    setError(""); setMsg("");
    try {
      const res = await apiClient.delete("/family/leave");
      setMsg(res.data.detail);
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to leave");
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(group.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) return <p>Loading…</p>;

  if (!group) {
    return (
      <div>
        <h1>Family View</h1>
        {error && <p className="error">{error}</p>}
        {msg && <p className="success-msg">{msg}</p>}
        <div className="family-setup-grid">
          <div className="card">
            <h2>Create a family group</h2>
            <p className="text-muted">Start a group and share the invite code with family members.</p>
            <form className="crud-form" onSubmit={handleCreate} style={{ marginTop: "1rem" }}>
              <input
                type="text"
                placeholder="Group name (e.g. The Sharma Family)"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
              />
              <button type="submit">Create</button>
            </form>
          </div>
          <div className="card">
            <h2>Join an existing group</h2>
            <p className="text-muted">Enter the invite code shared by your family group owner.</p>
            <form className="crud-form" onSubmit={handleJoin} style={{ marginTop: "1rem" }}>
              <input
                type="text"
                placeholder="Invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                required
              />
              <button type="submit">Join</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>{group.name}</h1>
        <button className="btn-cancel" onClick={handleLeave}>Leave group</button>
      </div>
      {error && <p className="error">{error}</p>}
      {msg && <p className="success-msg">{msg}</p>}

      <div className="family-invite-bar">
        <span className="invite-label">Invite code:</span>
        <code className="invite-code">{group.invite_code}</code>
        <button className="export-btn" onClick={copyCode}>{copied ? "Copied!" : "Copy"}</button>
      </div>

      {dashboard && (
        <>
          <div className="card-grid" style={{ marginBottom: "1.5rem" }}>
            <div className="card card-accent">
              <h3>Combined Net Worth</h3>
              <p className="big-number positive">{fmt.format(dashboard.combined_net_worth)}</p>
            </div>
            <div className="card">
              <h3>Combined Assets</h3>
              <p className="big-number">{fmt.format(dashboard.combined_assets)}</p>
            </div>
            <div className="card">
              <h3>Combined Liabilities</h3>
              <p className="big-number">{fmt.format(dashboard.combined_liabilities)}</p>
            </div>
            <div className="card">
              <h3>Members</h3>
              <p className="big-number">{dashboard.members.length}</p>
            </div>
          </div>

          <div className="card">
            <h2>Members breakdown</h2>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Total Assets</th>
                    <th>Total Liabilities</th>
                    <th>Net Worth</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.members.map((m) => (
                    <tr key={m.user_id}>
                      <td>{m.name}</td>
                      <td>{m.email}</td>
                      <td>{fmt.format(m.total_assets)}</td>
                      <td>{fmt.format(m.total_liabilities)}</td>
                      <td className={m.net_worth >= 0 ? "positive" : "negative"}>
                        {fmt.format(m.net_worth)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
