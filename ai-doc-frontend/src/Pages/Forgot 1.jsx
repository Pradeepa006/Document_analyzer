import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Forgot 1.css";
import "./Login 1.css";

export default function Forgot() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
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
    const base = import.meta.env.VITE_API_URL || "http://localhost:8000";
    setLoading(true);
    fetch(`${base}/api/v1/auth/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, new_password: newPassword }),
    })
      .then(async (resp) => {
        const data = await resp.json().catch(() => ({}));
        if (resp.ok) {
          setMessage("Password reset successful. You can now sign in.");
          setTimeout(() => navigate("/login"), 2000);
        } else {
          setError(data.detail || data.msg || "Reset failed. Check your email.");
        }
      })
      .catch(() => setError("Cannot reach backend. Is the server running?"))
      .finally(() => setLoading(false));
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

              {message && <div className="alert success">{message}</div>}
              {error && <div className="alert error">{error}</div>}

              <div className="forgot-actions">
                <button type="submit" className="btn" disabled={loading}>{loading ? "Resetting..." : "Reset password"}</button>
                <a href="/login" className="back-link">Back to login</a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
