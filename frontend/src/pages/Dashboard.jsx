import { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import apiClient from "../api/client";

const CURRENCIES = [
  { code: "INR", label: "₹ INR" },
  { code: "USD", label: "$ USD" },
  { code: "EUR", label: "€ EUR" },
  { code: "GBP", label: "£ GBP" },
  { code: "SGD", label: "SGD" },
  { code: "AUD", label: "AUD" },
  { code: "CAD", label: "CAD" },
  { code: "JPY", label: "¥ JPY" },
  { code: "CHF", label: "CHF" },
  { code: "MYR", label: "MYR" },
];

// ECB-supported codes only; exclude INR (fetched separately) and EUR (it's the base)
const FX_CODES = "INR,USD,GBP,SGD,AUD,CAD,JPY,CHF,MYR";

function makeFmt(currency) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "JPY" ? 0 : 2,
  });
}

const COLORS = {
  "Real Estate": "#4f46e5",
  Gold: "#f59e0b",
  Silver: "#94a3b8",
  "Fixed Deposits": "#06b6d4",
  "MF & Stocks": "#8b5cf6",
  Vehicles: "#f97316",
  Other: "#6b7280",
  "Bank Accounts": "#10b981",
  Liabilities: "#ef4444",
};

const RADIAN = Math.PI / 180;
function CustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  if (percent < 0.04) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {(percent * 100).toFixed(0)}%
    </text>
  );
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loans, setLoans] = useState([]);
  const [creditCards, setCreditCards] = useState([]);
  const [properties, setProperties] = useState([]);
  const [goldAssets, setGoldAssets] = useState([]);
  const [silverAssets, setSilverAssets] = useState([]);
  const [familyData, setFamilyData] = useState(null);
  const [history, setHistory] = useState([]);
  const [txSummary, setTxSummary] = useState(null);
  const [portfolio, setPortfolio] = useState(null);
  const [view, setView] = useState("personal");
  const [error, setError] = useState("");

  const [currency, setCurrency] = useState("INR");
  const [fxRates, setFxRates] = useState({});
  const [fxRate, setFxRate] = useState(1);
  const [fxLoading, setFxLoading] = useState(false);
  const [fxDate, setFxDate] = useState("");
  const [fxError, setFxError] = useState("");

  useEffect(() => {
    Promise.all([
      apiClient.get("/dashboard/summary"),
      apiClient.get("/loans"),
      apiClient.get("/credit-cards"),
      apiClient.get("/properties"),
      apiClient.get("/gold"),
      apiClient.get("/silver"),
      apiClient.get("/family/dashboard").catch(() => null),
    ])
      .then(([summaryRes, loansRes, ccRes, propRes, goldRes, silverRes, familyRes]) => {
        setSummary(summaryRes.data);
        setLoans(loansRes.data);
        setCreditCards(ccRes.data);
        setProperties(propRes.data);
        setGoldAssets(goldRes.data);
        setSilverAssets(silverRes.data);
        if (familyRes) setFamilyData(familyRes.data);
        apiClient.post("/networth/snapshot").then(() =>
          apiClient.get("/networth/history?days=365").then((r) => setHistory(r.data))
        ).catch(() => {});
        const thisMonth = new Date().toISOString().slice(0, 7);
        apiClient.get(`/transactions/summary/${thisMonth}`).then((r) => setTxSummary(r.data)).catch(() => {});
        apiClient.get("/dashboard/portfolio").then((r) => { if (r.data.items.length) setPortfolio(r.data); }).catch(() => {});
      })
      .catch((err) => setError(err.response?.data?.detail || "Failed to load dashboard"));
  }, []);

  useEffect(() => {
    setFxLoading(true);
    setFxError("");
    fetch(`https://api.frankfurter.dev/v1/latest?from=EUR&to=${FX_CODES}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!data.rates) throw new Error("No rates in response");
        const eurToInr = data.rates["INR"];
        if (!eurToInr) throw new Error("INR rate missing");
        const rates = { INR: 1, EUR: 1 / eurToInr };
        Object.entries(data.rates).forEach(([code, eurRate]) => {
          if (code !== "INR") rates[code] = eurRate / eurToInr;
        });
        setFxRates(rates);
        setFxDate(data.date);
        setFxRate(rates[currency] ?? 1);
      })
      .catch((err) => {
        console.error("FX fetch failed:", err);
        setFxError("FX rates unavailable");
      })
      .finally(() => setFxLoading(false));
  }, []);

  useEffect(() => {
    if (Object.keys(fxRates).length === 0) return;
    setFxRate(fxRates[currency] ?? 1);
    setFxError(fxRates[currency] ? "" : `Rate not available for ${currency}`);
  }, [currency, fxRates]);

  function exportPDF() {
    const doc = new jsPDF();
    const c = (v) => fmt.format(v * fxRate);
    const date = new Date().toLocaleDateString("en-IN");

    doc.setFontSize(18);
    doc.text("Asset & Liability Report", 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`Generated: ${date}  |  Currency: ${currency}`, 14, 27);
    doc.setTextColor(0);

    autoTable(doc, {
      startY: 33,
      head: [["Summary", "Value"]],
      body: [
        ["Net Worth", c(summary.net_worth)],
        ["Total Assets", c(summary.total_assets)],
        ["Total Liabilities", c(summary.total_liabilities)],
        ["Real Estate", c(summary.total_real_estate_value)],
        ["Gold", c(summary.total_gold_value)],
        ["Silver", c(summary.total_silver_value)],
      ],
      headStyles: { fillColor: [79, 70, 229] },
    });

    if (properties.length) {
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        head: [["Real Estate — Address", "Type", "Value", "Owner"]],
        body: properties.map((p) => [p.address, p.property_type, c(p.current_value), p.owner_name || "-"]),
        headStyles: { fillColor: [79, 70, 229] },
      });
    }

    if (goldAssets.length) {
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        head: [["Gold — Article", "Weight (g)", "Purity (k)", "Owner"]],
        body: goldAssets.map((g) => [g.article_name, g.weight_grams, g.purity_karat, g.owner_name || "-"]),
        headStyles: { fillColor: [245, 158, 11] },
      });
    }

    if (silverAssets.length) {
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        head: [["Silver — Article", "Weight (g)", "Purity (%)", "Owner"]],
        body: silverAssets.map((s) => [s.article_name, s.weight_grams, s.purity_percent, s.owner_name || "-"]),
        headStyles: { fillColor: [148, 163, 184] },
      });
    }

    if (loans.length) {
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        head: [["Loans — Lender", "Type", "Principal", "Outstanding", "Monthly EMI", "Paid From"]],
        body: loans.map((l) => [
          l.bank_name, l.loan_type,
          c(l.principal_amount), c(l.remaining_balance), c(l.monthly_payment),
          l.payment_bank || "-",
        ]),
        headStyles: { fillColor: [239, 68, 68] },
      });
    }

    doc.save(`asset-report-${date}.pdf`);
  }

  function exportExcel() {
    const c = (v) => parseFloat((v * fxRate).toFixed(2));
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      [`Asset & Liability Report — ${currency} — ${new Date().toLocaleDateString("en-IN")}`],
      [],
      ["Summary", "Value"],
      ["Net Worth", c(summary.net_worth)],
      ["Total Assets", c(summary.total_assets)],
      ["Total Liabilities", c(summary.total_liabilities)],
      ["Real Estate", c(summary.total_real_estate_value)],
      ["Gold", c(summary.total_gold_value)],
      ["Silver", c(summary.total_silver_value)],
    ]), "Summary");

    if (properties.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        properties.map((p) => ({ Address: p.address, Type: p.property_type, [`Value (${currency})`]: c(p.current_value), Owner: p.owner_name || "" }))
      ), "Real Estate");
    }

    if (goldAssets.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        goldAssets.map((g) => ({ Article: g.article_name, "Weight (g)": g.weight_grams, "Purity (k)": g.purity_karat, Owner: g.owner_name || "" }))
      ), "Gold");
    }

    if (silverAssets.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        silverAssets.map((s) => ({ Article: s.article_name, "Weight (g)": s.weight_grams, "Purity (%)": s.purity_percent, Owner: s.owner_name || "" }))
      ), "Silver");
    }

    if (loans.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
        loans.map((l) => ({
          Lender: l.bank_name, Type: l.loan_type,
          [`Principal (${currency})`]: c(l.principal_amount),
          [`Outstanding (${currency})`]: c(l.remaining_balance),
          [`Monthly EMI (${currency})`]: c(l.monthly_payment),
          "Paid From": l.payment_bank || "",
        }))
      ), "Loans");
    }

    XLSX.writeFile(wb, `asset-report-${new Date().toLocaleDateString("en-IN").replace(/\//g, "-")}.xlsx`);
  }

  if (error) return <p className="error">{error}</p>;
  if (!summary) return <p>Loading...</p>;

  const fmt = makeFmt(currency);
  const cx = (inr) => inr * fxRate;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  function daysUntil(dateStr) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return Math.round((d - today) / 86400000);
  }

  const alerts = [];
  creditCards.forEach((cc) => {
    const days = daysUntil(cc.due_date);
    if (days === null || cc.outstanding_amount <= 0) return;
    if (days < 0) alerts.push({ type: "danger", msg: `${cc.card_name || cc.bank_name} credit card payment of ${fmt.format(cx(cc.outstanding_amount))} is overdue by ${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""}` });
    else if (days <= 7) alerts.push({ type: days <= 2 ? "danger" : "warning", msg: `${cc.card_name || cc.bank_name} credit card payment of ${fmt.format(cx(cc.outstanding_amount))} due in ${days} day${days !== 1 ? "s" : ""}` });
  });
  loans.forEach((loan) => {
    if (!loan.monthly_payment || loan.remaining_balance <= 0) return;
    const days = daysUntil(loan.next_due_date);
    if (days === null) return;
    if (days < 0) alerts.push({ type: "danger", msg: `${loan.bank_name} loan EMI of ${fmt.format(cx(loan.monthly_payment))} is overdue by ${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""}` });
    else if (days <= 7) alerts.push({ type: days <= 2 ? "danger" : "warning", msg: `${loan.bank_name} loan EMI of ${fmt.format(cx(loan.monthly_payment))} due in ${days} day${days !== 1 ? "s" : ""}` });
  });

  const pieData = [
    { name: "Real Estate", value: summary.total_real_estate_value },
    { name: "Gold", value: summary.total_gold_value },
    { name: "Silver", value: summary.total_silver_value },
    { name: "Fixed Deposits", value: summary.total_fd_value },
    { name: "MF & Stocks", value: summary.total_mf_value },
    { name: "Vehicles", value: summary.total_vehicle_value },
    { name: "Other", value: summary.total_other_value },
    { name: "Bank Accounts", value: summary.total_bank_balance },
    { name: "Liabilities", value: summary.total_liabilities },
  ].filter((d) => d.value > 0);

  return (
    <div>
      <div className="dashboard-header">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <h1 style={{ margin: 0 }}>
            {view === "family" && familyData ? `${familyData.group_name} — ` : ""}Net Worth Dashboard
          </h1>
          {familyData && (
            <div className="view-toggle">
              <button
                className={`view-toggle-btn ${view === "personal" ? "active" : ""}`}
                onClick={() => setView("personal")}
              >Personal</button>
              <button
                className={`view-toggle-btn ${view === "family" ? "active" : ""}`}
                onClick={() => setView("family")}
              >Family</button>
            </div>
          )}
        </div>
        <div className="dashboard-actions">
          <div className="currency-switcher">
          <label className="currency-switcher-label">View in</label>
          <select
            className="currency-switcher-select"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.label}</option>
            ))}
          </select>
          {fxLoading && <span className="fx-loading">loading…</span>}
          {fxError && !fxLoading && <span style={{ color: "#ef4444", fontSize: "0.8rem" }}>{fxError}</span>}
          {fxDate && !fxLoading && !fxError && (
            <span className="fx-date">Rate: {fxDate}</span>
          )}
          </div>
          <div className="export-btns">
            <button className="export-btn" onClick={exportPDF}>⬇ PDF</button>
            <button className="export-btn export-btn-green" onClick={exportExcel}>⬇ Excel</button>
          </div>
        </div>
      </div>

      {view === "family" && familyData ? (
        <>
          <div className="card-grid">
            <div className="card card-accent">
              <h3>Combined Net Worth</h3>
              <p className={`big-number ${familyData.combined_net_worth >= 0 ? "positive" : "negative"}`}>
                {fmt.format(cx(familyData.combined_net_worth))}
              </p>
            </div>
            <div className="card">
              <h3>Combined Assets</h3>
              <p className="big-number">{fmt.format(cx(familyData.combined_assets))}</p>
            </div>
            <div className="card">
              <h3>Combined Liabilities</h3>
              <p className="big-number">{fmt.format(cx(familyData.combined_liabilities))}</p>
            </div>
            <div className="card">
              <h3>Members</h3>
              <p className="big-number">{familyData.members.length}</p>
            </div>
          </div>

          <div className="card">
            <h2>Members breakdown</h2>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Total Assets</th>
                    <th>Total Liabilities</th>
                    <th>Net Worth</th>
                    <th>Share of family</th>
                  </tr>
                </thead>
                <tbody>
                  {familyData.members.map((m) => {
                    const sharePct = familyData.combined_assets > 0
                      ? ((m.total_assets / familyData.combined_assets) * 100).toFixed(1)
                      : "0.0";
                    return (
                      <tr key={m.user_id}>
                        <td><strong>{m.name}</strong><br /><span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{m.email}</span></td>
                        <td>{fmt.format(cx(m.total_assets))}</td>
                        <td>{fmt.format(cx(m.total_liabilities))}</td>
                        <td className={m.net_worth >= 0 ? "positive" : "negative"}>{fmt.format(cx(m.net_worth))}</td>
                        <td>
                          <div className="progress-track" style={{ width: 100, display: "inline-block" }}>
                            <div className="progress-fill" style={{ width: `${sharePct}%` }} />
                          </div>
                          <span style={{ marginLeft: "0.5rem", fontSize: "0.85rem" }}>{sharePct}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
      <div className="card-grid">
        <div className="card card-accent">
          <h3>Net Worth</h3>
          <p className={`big-number ${summary.net_worth >= 0 ? "positive" : "negative"}`}>
            {fmt.format(cx(summary.net_worth))}
          </p>
        </div>
        <div className="card">
          <h3>Total Assets</h3>
          <p className="big-number">{fmt.format(cx(summary.total_assets))}</p>
        </div>
        <div className="card">
          <h3>Total Liabilities</h3>
          <p className="big-number">{fmt.format(cx(summary.total_liabilities))}</p>
        </div>
        <div className="card">
          <h3>Credit Card Due</h3>
          <p className="big-number negative">{fmt.format(cx(summary.total_credit_card_outstanding))}</p>
        </div>
        {txSummary && (
          <div className="card">
            <h3>This month — savings</h3>
            <p className={`big-number ${txSummary.net_savings >= 0 ? "positive" : "negative"}`}>
              {fmt.format(cx(txSummary.net_savings))}
            </p>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0.3rem 0 0" }}>
              {fmt.format(cx(txSummary.total_income))} in · {fmt.format(cx(txSummary.total_expenses))} out
            </p>
          </div>
        )}
      </div>

      {alerts.length > 0 && (
        <div className="alerts-panel">
          <h2 className="alerts-title">⚠ Upcoming payments</h2>
          {alerts.map((a, i) => (
            <div key={i} className={`alert-item alert-${a.type}`}>{a.msg}</div>
          ))}
        </div>
      )}

      <div className="charts-row">
        <div className="card chart-card">
          <h2>Asset &amp; Liability Breakdown</h2>
          {pieData.length === 0 ? (
            <p className="chart-empty">Add assets or loans to see breakdown</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="value"
                  labelLine={false}
                  label={CustomLabel}
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={COLORS[entry.name] || "#6366f1"} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => fmt.format(cx(value))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card chart-card">
          <h2>Market Rates</h2>
          <table className="data-table rates-table">
            <thead>
              <tr><th>Metal</th><th>Live Rate</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>🥇 Gold 24k</td>
                <td className="rate-value">{fmt.format(cx(summary.gold_rate_per_gram_24k))}/g</td>
              </tr>
              <tr>
                <td>🥈 Silver</td>
                <td className="rate-value">{fmt.format(cx(summary.silver_rate_per_gram))}/g</td>
              </tr>
              <tr>
                <td>⬜ Platinum</td>
                <td className="rate-value">{fmt.format(cx(summary.platinum_rate_per_gram))}/g</td>
              </tr>
            </tbody>
          </table>
          <table className="data-table rates-table" style={{ marginTop: "0.8rem" }}>
            <thead>
              <tr><th>Your Assets</th><th>Value</th></tr>
            </thead>
            <tbody>
              <tr><td>Real Estate</td><td className="rate-value">{fmt.format(cx(summary.total_real_estate_value))}</td></tr>
              <tr><td>Gold</td><td className="rate-value">{fmt.format(cx(summary.total_gold_value))}</td></tr>
              <tr><td>Silver</td><td className="rate-value">{fmt.format(cx(summary.total_silver_value))}</td></tr>
              <tr><td>Fixed Deposits</td><td className="rate-value">{fmt.format(cx(summary.total_fd_value))}</td></tr>
              <tr><td>MF &amp; Stocks</td><td className="rate-value">{fmt.format(cx(summary.total_mf_value))}</td></tr>
              <tr><td>Vehicles</td><td className="rate-value">{fmt.format(cx(summary.total_vehicle_value))}</td></tr>
              <tr><td>Other</td><td className="rate-value">{fmt.format(cx(summary.total_other_value))}</td></tr>
              <tr><td>Bank Accounts</td><td className="rate-value">{fmt.format(cx(summary.total_bank_balance))}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {portfolio && (
        <div className="card" style={{ marginTop: "1.5rem" }}>
          <h2>Portfolio Return</h2>
          <div className="card-grid" style={{ marginBottom: "1rem" }}>
            <div className="card">
              <h3>Total Invested</h3>
              <p className="big-number">{fmt.format(cx(portfolio.total_invested))}</p>
            </div>
            <div className="card">
              <h3>Current Value</h3>
              <p className="big-number">{fmt.format(cx(portfolio.total_current))}</p>
            </div>
            <div className="card card-accent">
              <h3>Total Gain / Loss</h3>
              <p className={`big-number ${portfolio.total_gain >= 0 ? "positive" : "negative"}`}>
                {portfolio.total_gain >= 0 ? "+" : ""}{fmt.format(cx(portfolio.total_gain))}
                <span style={{ fontSize: "1rem", marginLeft: "0.4rem", opacity: 0.75 }}>
                  ({portfolio.total_gain_pct.toFixed(1)}%)
                </span>
              </p>
            </div>
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr><th>Asset</th><th>Type</th><th>Invested</th><th>Current</th><th>Gain / Loss</th><th>Return</th></tr>
              </thead>
              <tbody>
                {portfolio.items.map((item, i) => (
                  <tr key={i}>
                    <td>{item.name}</td>
                    <td>{item.asset_type}</td>
                    <td>{fmt.format(cx(item.purchase_price))}</td>
                    <td>{fmt.format(cx(item.current_value))}</td>
                    <td className={item.gain >= 0 ? "positive" : "negative"}>
                      {item.gain >= 0 ? "+" : ""}{fmt.format(cx(item.gain))}
                    </td>
                    <td>
                      <span className={`gain-badge ${item.gain_pct >= 0 ? "gain-pos" : "gain-neg"}`}>
                        {item.gain_pct >= 0 ? "▲" : "▼"} {Math.abs(item.gain_pct).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {history.length > 1 && (
        <div className="card" style={{ marginTop: "1.5rem" }}>
          <h2>Net Worth Over Time</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={history} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                tickFormatter={(d) => {
                  const [, m, day] = d.split("-");
                  return `${day}/${m}`;
                }}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                tickFormatter={(v) => {
                  if (Math.abs(v) >= 1e7) return `${(v / 1e7).toFixed(1)}Cr`;
                  if (Math.abs(v) >= 1e5) return `${(v / 1e5).toFixed(1)}L`;
                  return v;
                }}
                width={64}
              />
              <Tooltip
                formatter={(value, name) => [fmt.format(cx(value)), name === "net_worth" ? "Net Worth" : name === "total_assets" ? "Assets" : "Liabilities"]}
                labelFormatter={(d) => `Date: ${d}`}
              />
              <Legend formatter={(val) => val === "net_worth" ? "Net Worth" : val === "total_assets" ? "Assets" : "Liabilities"} />
              <Line type="monotone" dataKey="total_assets" stroke="#10b981" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="total_liabilities" stroke="#ef4444" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="net_worth" stroke="#4f46e5" dot={false} strokeWidth={2.5} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {loans.length > 0 && (
        <div className="card">
          <h2>Loan Repayment Progress</h2>
          <div className="loan-progress-list">
            {loans.map((loan) => {
              const total = loan.principal_amount;
              const paid = total - loan.remaining_balance;
              const pct = total > 0 ? Math.min((paid / total) * 100, 100) : 0;
              const monthsLeft = loan.monthly_payment > 0
                ? Math.ceil(loan.remaining_balance / loan.monthly_payment)
                : null;
              return (
                <div key={loan.id} className="loan-progress-item">
                  <div className="loan-progress-header">
                    <div>
                      <span className="loan-name">{loan.bank_name}</span>
                      {loan.loan_type && (
                        <span className="loan-type-badge">{loan.loan_type}</span>
                      )}
                    </div>
                    <span className="loan-amounts">
                      {fmt.format(cx(paid))} paid of {fmt.format(cx(total))}
                    </span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="loan-stats-row">
                    <div className="loan-stat">
                      <span className="loan-stat-label">Outstanding</span>
                      <span className="loan-stat-value loan-remaining">{fmt.format(cx(loan.remaining_balance))}</span>
                    </div>
                    <div className="loan-stat">
                      <span className="loan-stat-label">Monthly EMI</span>
                      <span className="loan-stat-value">{fmt.format(cx(loan.monthly_payment))}</span>
                    </div>
                    {monthsLeft !== null && (
                      <div className="loan-stat">
                        <span className="loan-stat-label">Est. months left</span>
                        <span className="loan-stat-value">{monthsLeft}</span>
                      </div>
                    )}
                    <div className="loan-stat">
                      <span className="loan-stat-label">% Repaid</span>
                      <span className="loan-stat-value">{pct.toFixed(1)}%</span>
                    </div>
                  </div>
                  {loan.payment_bank && (
                    <div className="loan-payment-bank">Debited from: {loan.payment_bank}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {creditCards.length > 0 && (
        <div className="card">
          <h2>Credit Card Utilisation</h2>
          <div className="loan-progress-list">
            {creditCards.map((card) => {
              const pct = card.credit_limit > 0
                ? Math.min((card.outstanding_amount / card.credit_limit) * 100, 100)
                : 0;
              const available = card.credit_limit - card.outstanding_amount;
              const fillColor = pct >= 90 ? "#ef4444" : pct >= 60 ? "#f97316" : "#4f46e5";
              return (
                <div key={card.id} className="loan-progress-item">
                  <div className="loan-progress-header">
                    <div>
                      <span className="loan-name">{card.bank_name}</span>
                      {card.card_name && (
                        <span className="loan-type-badge">{card.card_name}</span>
                      )}
                    </div>
                    <span className="loan-amounts">
                      {fmt.format(cx(card.outstanding_amount))} used of {fmt.format(cx(card.credit_limit))}
                    </span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: fillColor }} />
                  </div>
                  <div className="loan-stats-row">
                    <div className="loan-stat">
                      <span className="loan-stat-label">Amount Due</span>
                      <span className="loan-stat-value loan-remaining">{fmt.format(cx(card.outstanding_amount))}</span>
                    </div>
                    <div className="loan-stat">
                      <span className="loan-stat-label">Available</span>
                      <span className="loan-stat-value" style={{ color: "var(--success)" }}>{fmt.format(cx(available))}</span>
                    </div>
                    <div className="loan-stat">
                      <span className="loan-stat-label">Utilisation</span>
                      <span className="loan-stat-value" style={{ color: fillColor }}>{pct.toFixed(1)}%</span>
                    </div>
                    {card.due_date && (
                      <div className="loan-stat">
                        <span className="loan-stat-label">Due Date</span>
                        <span className="loan-stat-value">{card.due_date}</span>
                      </div>
                    )}
                  </div>
                  {card.owner_name && (
                    <div className="loan-payment-bank">Owner: {card.owner_name}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
