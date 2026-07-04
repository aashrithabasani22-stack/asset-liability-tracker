import { Link, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <nav className="navbar">
        <div className="nav-brand">💰 Asset Tracker</div>
        <div className="nav-links">
          <Link to="/">Dashboard</Link>
          <Link to="/properties">Real Estate</Link>
          <Link to="/gold">Gold</Link>
          <Link to="/silver">Silver</Link>
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
