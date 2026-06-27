import { useEffect, useState } from "react";
import apiClient from "../api/client";

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiClient
      .get("/dashboard/summary")
      .then((res) => setSummary(res.data))
      .catch((err) => setError(err.response?.data?.detail || "Failed to load dashboard"));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!summary) return <p>Loading...</p>;

  return (
    <div>
      <h1>Net Worth Dashboard</h1>
      <div className="card-grid">
        <div className="card card-accent">
          <h3>Net Worth</h3>
          <p className={`big-number ${summary.net_worth >= 0 ? "positive" : "negative"}`}>
            {currencyFormatter.format(summary.net_worth)}
          </p>
        </div>
        <div className="card">
          <h3>Total Assets</h3>
          <p className="big-number">{currencyFormatter.format(summary.total_assets)}</p>
        </div>
        <div className="card">
          <h3>Total Liabilities</h3>
          <p className="big-number">{currencyFormatter.format(summary.total_liabilities)}</p>
        </div>
      </div>

      <h2>Asset Breakdown</h2>
      <table className="data-table">
        <tbody>
          <tr>
            <td>Real Estate</td>
            <td>{currencyFormatter.format(summary.total_real_estate_value)}</td>
          </tr>
          <tr>
            <td>Gold (rate: {currencyFormatter.format(summary.gold_rate_per_gram_24k)}/g 24k)</td>
            <td>{currencyFormatter.format(summary.total_gold_value)}</td>
          </tr>
          <tr>
            <td>Silver (rate: {currencyFormatter.format(summary.silver_rate_per_gram)}/g)</td>
            <td>{currencyFormatter.format(summary.total_silver_value)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
