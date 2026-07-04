import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import apiClient from "../api/client";

const CURRENCIES = [
  { code: "INR", label: "₹ INR" },
  { code: "USD", label: "$ USD" },
  { code: "EUR", label: "€ EUR" },
  { code: "GBP", label: "£ GBP" },
  { code: "AED", label: "AED" },
  { code: "SGD", label: "SGD" },
  { code: "AUD", label: "AUD" },
  { code: "CAD", label: "CAD" },
  { code: "JPY", label: "¥ JPY" },
  { code: "SAR", label: "SAR" },
];

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
  const [error, setError] = useState("");

  const [currency, setCurrency] = useState("INR");
  const [fxRate, setFxRate] = useState(1);
  const [fxLoading, setFxLoading] = useState(false);
  const [fxDate, setFxDate] = useState("");

  useEffect(() => {
    Promise.all([
      apiClient.get("/dashboard/summary"),
      apiClient.get("/loans"),
    ])
      .then(([summaryRes, loansRes]) => {
        setSummary(summaryRes.data);
        setLoans(loansRes.data);
      })
      .catch((err) => setError(err.response?.data?.detail || "Failed to load dashboard"));
  }, []);

  useEffect(() => {
    if (currency === "INR") { setFxRate(1); setFxDate(""); return; }
    setFxLoading(true);
    fetch(`https://api.frankfurter.app/latest?from=INR&to=${currency}`)
      .then((r) => r.json())
      .then((data) => {
        setFxRate(data.rates[currency]);
        setFxDate(data.date);
      })
      .catch(() => setFxRate(1))
      .finally(() => setFxLoading(false));
  }, [currency]);

  if (error) return <p className="error">{error}</p>;
  if (!summary) return <p>Loading...</p>;

  const fmt = makeFmt(currency);
  const cx = (inr) => inr * fxRate;

  const pieData = [
    { name: "Real Estate", value: summary.total_real_estate_value },
    { name: "Gold", value: summary.total_gold_value },
    { name: "Silver", value: summary.total_silver_value },
    { name: "Liabilities", value: summary.total_liabilities },
  ].filter((d) => d.value > 0);

  return (
    <div>
      <div className="dashboard-header">
        <h1>Net Worth Dashboard</h1>
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
          {fxLoading && <span className="fx-loading">updating…</span>}
          {fxDate && !fxLoading && (
            <span className="fx-date">Rate: {fxDate}</span>
          )}
        </div>
      </div>

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
      </div>

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
              <tr>
                <td>Real Estate</td>
                <td className="rate-value">{fmt.format(cx(summary.total_real_estate_value))}</td>
              </tr>
              <tr>
                <td>Gold</td>
                <td className="rate-value">{fmt.format(cx(summary.total_gold_value))}</td>
              </tr>
              <tr>
                <td>Silver</td>
                <td className="rate-value">{fmt.format(cx(summary.total_silver_value))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

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
    </div>
  );
}
