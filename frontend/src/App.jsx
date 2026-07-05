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
import Settings from "./pages/Settings";
import BankAccounts from "./pages/BankAccounts";
import CreditCards from "./pages/CreditCards";
import Family from "./pages/Family";
import Transactions from "./pages/Transactions";
import Goals from "./pages/Goals";
import Budget from "./pages/Budget";

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
            <Route path="/settings" element={<Settings />} />
            <Route path="/bank-accounts" element={<BankAccounts />} />
            <Route path="/credit-cards" element={<CreditCards />} />
            <Route path="/family" element={<Family />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/budget" element={<Budget />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
