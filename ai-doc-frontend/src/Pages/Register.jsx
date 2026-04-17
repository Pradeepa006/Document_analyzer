import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login 1.css";

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleRegister = (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);
    const base = import.meta.env.VITE_API_URL || "http://localhost:8000";
    fetch(`${base}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, full_name: fullName }),
    })
      .then(async (resp) => {
        const data = await resp.json().catch(() => ({}));
        if (resp.ok) {
          // clear any stale tokens then redirect to login
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setMessage("Registration successful. Redirecting to sign in...");
          setTimeout(() => navigate('/login', { replace: true }), 1200);
        } else {
          setError(data.detail || data.msg || data.message || "Invalid input");
        }
      })
      .catch((err) => setError(err?.message || "Network error"))
      .finally(() => setLoading(false));
  };

  return (
    <div className="login-container">
      <div className="login-grid">
        <div className="login-hero">
          <div className="hero-inner">
            <div className="hero-logo">DV</div>
            <h2 className="hero-welcome">Create account</h2>
            <h1 className="hero-title">Document Vault</h1>
            <p className="hero-sub">Create a secure account for your team.</p>
          </div>
        </div>

        <div className="login-panel">
          <div className="login-card">
            <h1 className="brand">Register</h1>
            <p className="tagline">Create your account</p>

            <form onSubmit={handleRegister} className="login-form">
              {message && <div className="alert success">{message}</div>}
              {error && <div className="alert error">{error}</div>}

              <div>
                <label className="label">Full name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="you@company.com"
                />
              </div>

              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  placeholder="Create a password"
                />
              </div>

              <button className="btn" disabled={loading}>{loading ? "Registering..." : "Register"}</button>

              <div style={{ marginTop: 8, textAlign: "center" }}>
                <a href="/login" className="link-btn">Back to sign in</a>
              </div>
            </form>

            <p className="footer">© 2026 Document Vault</p>
          </div>
        </div>
      </div>
    </div>
  );
}
