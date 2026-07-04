import { useEffect, useState } from "react";
import apiClient from "../api/client";

export default function Settings() {
  const [profile, setProfile] = useState({ name: "", email: "" });
  const [profileMsg, setProfileMsg] = useState("");
  const [profileError, setProfileError] = useState("");

  const [passwords, setPasswords] = useState({ current_password: "", new_password: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");

  useEffect(() => {
    apiClient.get("/auth/me").then((res) => setProfile({ name: res.data.name, email: res.data.email }));
  }, []);

  async function handleProfileSave(e) {
    e.preventDefault();
    setProfileMsg(""); setProfileError("");
    try {
      await apiClient.put("/auth/profile", profile);
      setProfileMsg("Profile updated successfully.");
    } catch (err) {
      setProfileError(err.response?.data?.detail || "Update failed");
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    setPwMsg(""); setPwError("");
    if (passwords.new_password !== passwords.confirm) {
      setPwError("New passwords do not match"); return;
    }
    if (passwords.new_password.length < 8) {
      setPwError("New password must be at least 8 characters"); return;
    }
    try {
      await apiClient.put("/auth/password", {
        current_password: passwords.current_password,
        new_password: passwords.new_password,
      });
      setPwMsg("Password changed successfully.");
      setPasswords({ current_password: "", new_password: "", confirm: "" });
    } catch (err) {
      setPwError(err.response?.data?.detail || "Password change failed");
    }
  }

  return (
    <div>
      <h1>Account Settings</h1>

      <div className="settings-grid">
        <div className="card settings-card">
          <h2 style={{ marginTop: 0 }}>Profile</h2>
          <form onSubmit={handleProfileSave} className="settings-form">
            <div className="settings-field">
              <label>Full Name</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                required
              />
            </div>
            <div className="settings-field">
              <label>Email Address</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                required
              />
            </div>
            {profileError && <p className="error">{profileError}</p>}
            {profileMsg && <p className="success-msg">{profileMsg}</p>}
            <button type="submit" className="settings-btn">Save Changes</button>
          </form>
        </div>

        <div className="card settings-card">
          <h2 style={{ marginTop: 0 }}>Change Password</h2>
          <form onSubmit={handlePasswordChange} className="settings-form">
            <div className="settings-field">
              <label>Current Password</label>
              <input
                type="password"
                value={passwords.current_password}
                onChange={(e) => setPasswords((p) => ({ ...p, current_password: e.target.value }))}
                required
              />
            </div>
            <div className="settings-field">
              <label>New Password</label>
              <input
                type="password"
                value={passwords.new_password}
                onChange={(e) => setPasswords((p) => ({ ...p, new_password: e.target.value }))}
                required
              />
            </div>
            <div className="settings-field">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={passwords.confirm}
                onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
                required
              />
            </div>
            {pwError && <p className="error">{pwError}</p>}
            {pwMsg && <p className="success-msg">{pwMsg}</p>}
            <button type="submit" className="settings-btn">Change Password</button>
          </form>
        </div>
      </div>
    </div>
  );
}
