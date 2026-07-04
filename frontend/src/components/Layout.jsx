import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function useDarkMode() {
  const [dark, setDark] = useState(() => localStorage.getItem("theme") === "dark");
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  }, [dark]);
  return [dark, setDark];
}

function NavDropdown({ label, links }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const location = useLocation();

  useEffect(() => { setOpen(false); }, [location.pathname]);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="nav-dropdown" ref={ref}>
      <button className="nav-dropdown-trigger" onClick={() => setOpen((o) => !o)}>
        {label} {open ? "▴" : "▾"}
      </button>
      {open && (
        <div className="nav-dropdown-menu">
          {links.map((l) => (
            <Link key={l.to} to={l.to}>{l.label}</Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useDarkMode();

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

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

        <button className="hamburger" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu">
          {menuOpen ? "✕" : "☰"}
        </button>

        <div className={`nav-links ${menuOpen ? "nav-open" : ""}`}>
          <Link to="/">Dashboard</Link>

          <NavDropdown label="Assets" links={[
            { to: "/properties", label: "Real Estate" },
            { to: "/gold", label: "Gold" },
            { to: "/silver", label: "Silver" },
            { to: "/bank-accounts", label: "Bank Accounts" },
            { to: "/fixed-deposits", label: "Fixed Deposits" },
            { to: "/mutual-funds", label: "MF & Stocks" },
            { to: "/vehicles", label: "Vehicles" },
            { to: "/other-assets", label: "Other" },
          ]} />

          <NavDropdown label="Liabilities" links={[
            { to: "/loans", label: "Loans" },
            { to: "/credit-cards", label: "Credit Cards" },
          ]} />

          <Link to="/family">Family</Link>
          <Link to="/currency">Currency</Link>
          <Link to="/settings">Settings</Link>
          <button className="theme-toggle" onClick={() => setDark((d) => !d)} title={dark ? "Switch to light mode" : "Switch to dark mode"}>
            {dark ? "☀" : "🌙"}
          </button>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </nav>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
