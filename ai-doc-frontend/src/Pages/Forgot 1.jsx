import { useState } from "react";
import "./Forgot.css";
import "./Login.css";

export default function Forgot() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!email) {
      setError("Please enter your email.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // placeholder behaviour - in real app call API
    alert(`Password reset for ${email} successful.`);
    window.location.hash = "/";
  };

  return (
    <div className="login-container">
      <div className="login-grid">
        <div className="login-hero">
          <div className="hero-inner">
            <div className="hero-logo">DV</div>
            <h1 className="hero-title">Reset Your Password</h1>
            <p className="hero-sub">Secure, searchable documents for your team.</p>
          </div>
        </div>

        <div className="login-panel">
          <div className="login-card">
            <h1 className="brand">Reset your password</h1>
            <p className="tagline">Enter your email and choose a new password.</p>

            <form onSubmit={handleSubmit} className="forgot-form login-form">
              <label className="label">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@company.com"
              />

              <label className="label">New password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input"
                placeholder="New password"
              />

              <label className="label">Confirm password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input"
                placeholder="Confirm password"
              />

              {error && <div className="error">{error}</div>}

              <div className="forgot-actions">
                <button type="submit" className="btn">Reset password</button>
                <a href="#/" className="back-link">Back to login</a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
