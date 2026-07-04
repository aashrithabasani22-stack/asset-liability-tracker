import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./App.css";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Properties from "./pages/Properties";
import Gold from "./pages/Gold";
import Silver from "./pages/Silver";
import Loans from "./pages/Loans";
import CurrencyConverter from "./pages/CurrencyConverter";
import FixedDeposits from "./pages/FixedDeposits";
import MutualFunds from "./pages/MutualFunds";
import Vehicles from "./pages/Vehicles";
import OtherAssets from "./pages/OtherAssets";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/properties" element={<Properties />} />
            <Route path="/gold" element={<Gold />} />
            <Route path="/silver" element={<Silver />} />
            <Route path="/loans" element={<Loans />} />
            <Route path="/fixed-deposits" element={<FixedDeposits />} />
            <Route path="/mutual-funds" element={<MutualFunds />} />
            <Route path="/vehicles" element={<Vehicles />} />
            <Route path="/other-assets" element={<OtherAssets />} />
            <Route path="/currency" element={<CurrencyConverter />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
