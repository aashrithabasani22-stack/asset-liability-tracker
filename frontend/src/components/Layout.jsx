import { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_GROUPS = [
  {
    label: "Assets",
    links: [
      { to: "/properties", label: "Real Estate" },
      { to: "/gold", label: "Gold" },
      { to: "/silver", label: "Silver" },
      { to: "/fixed-deposits", label: "Fixed Deposits" },
      { to: "/mutual-funds", label: "MF & Stocks" },
      { to: "/vehicles", label: "Vehicles" },
      { to: "/other-assets", label: "Other" },
    ],
  },
  {
    label: "Liabilities",
    links: [{ to: "/loans", label: "Loans" }],
  },
];

export default function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [assetsOpen, setAssetsOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <nav className="navbar">
        <div className="nav-brand">
          <Link to="/" style={{ color: "inherit", textDecoration: "none" }}>💰 Asset Tracker</Link>
        </div>
        <div className="nav-links">
          <Link to="/">Dashboard</Link>

          <div className="nav-dropdown" onMouseEnter={() => setAssetsOpen(true)} onMouseLeave={() => setAssetsOpen(false)}>
            <span className="nav-dropdown-trigger">Assets ▾</span>
            {assetsOpen && (
              <div className="nav-dropdown-menu">
                {NAV_GROUPS[0].links.map((l) => (
                  <Link key={l.to} to={l.to} onClick={() => setAssetsOpen(false)}>{l.label}</Link>
                ))}
              </div>
            )}
          </div>

          <Link to="/loans">Loans</Link>
          <Link to="/currency">Currency</Link>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </nav>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
