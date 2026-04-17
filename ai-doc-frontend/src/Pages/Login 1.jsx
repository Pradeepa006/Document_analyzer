import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Login 1.css";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [fullName, setFullName] = useState("");

  const extractError = (data) => {
    if (Array.isArray(data.detail)) {
      return data.detail.map((e) => e.msg || JSON.stringify(e)).join('; ');
    }
    return data.detail || data.msg || data.message || "Invalid input";
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);
    const base = import.meta.env.VITE_API_URL || "http://localhost:8000";
    if (isRegistering) {
      fetch(`${base}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, full_name: fullName }),
      })
        .then(async (resp) => {
          const data = await resp.json().catch(() => ({}));
          if (resp.ok) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            setMessage("Registration successful. Redirecting to sign in...");
            setIsRegistering(false);
            setPassword("");
            setTimeout(() => navigate('/login', { replace: true }), 900);
          } else {
            setError(extractError(data));
          }
        })
        .catch((err) => {
          const msg = err?.message === 'Failed to fetch'
            ? `Cannot reach backend at ${base}. Is the backend running?`
            : (err?.message || 'Network error');
          setError(msg);
        })
        .finally(() => setLoading(false));
    } else {
      fetch(`${base}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
        .then(async (resp) => {
          const data = await resp.json().catch(() => ({}));
          if (resp.ok) {
            if (data.access_token) localStorage.setItem("access_token", data.access_token);
            if (data.refresh_token) localStorage.setItem("refresh_token", data.refresh_token);
            navigate('/app');
          } else {
            setError(extractError(data));
          }
        })
        .catch((err) => {
          const msg = err?.message === 'Failed to fetch'
            ? `Cannot reach backend at ${base}. Is the backend running?`
            : (err?.message || 'Network error');
          setError(msg);
        })
        .finally(() => setLoading(false));
    }
  };
  
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      "618130587979-mnkp3i02aaobqh3jiov9jo2t8f0fkr85.apps.googleusercontent.com";

    const handleCredentialResponse = (resp) => {
      if (!resp || !resp.credential) return;
      const cred = resp.credential;
      const parts = typeof cred === 'string' ? cred.split('.') : [];
      if (parts.length >= 2 && parts[1]) {
        // handle URL-safe Base64
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const pad = base64.length % 4;
        const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
        const decoded = atob(padded);
        const payload = JSON.parse(decoded);
        console.log('Google user', payload);
        // you can set app state or localStorage here
        alert(`Signed in as ${payload.name || payload.email}`);
      } else {
        console.error('Invalid credential format', resp);
      }
    };

    const initGIS = () => {
      if (!window.google || !window.google.accounts || !window.google.accounts.id) return;
      if (window._gis_initialized) return;
      window._gis_initialized = true;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
      });
      const container = document.getElementById('g_id_signin');
      if (container) {
        window.google.accounts.id.renderButton(container, {
          theme: 'outline',
          size: 'large',
          width: '100%'
        });
      }
    };

    // If the GIS object already exists, init immediately
    if (window.google && window.google.accounts && window.google.accounts.id) {
      initGIS();
      return;
    }

    // Otherwise, wait for the script to load (script has id="gsi-client")
    const script = document.getElementById('gsi-client') || document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (script) {
      script.addEventListener('load', initGIS);
      return () => script.removeEventListener('load', initGIS);
    }

    // Fallback: inject the GIS script if it's not present
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.id = 'gsi-client';
    s.onload = initGIS;
    document.head.appendChild(s);
    return () => { s.onload = null; };
  }, []);

  return (
    <div className="login-container">
      <div className="login-grid">
        <div className="login-hero">
          <div className="hero-inner">
            <div className="hero-logo">DV</div>
            <h2 className="hero-welcome">{isRegistering ? "Create account" : "Welcome to"}</h2>
            <h1 className="hero-title">Document Vault</h1>
            <p className="hero-sub">{isRegistering ? "Create a secure account for your team." : "Secure, searchable documents for your team."}</p>
          </div>
        </div>

        <div className="login-panel">
          <div className="login-card">
            <h1 className="brand">{isRegistering ? "Register" : "Login"}</h1>
            <p className="tagline">{isRegistering ? "Create your account" : "Secure access to your workspace"}</p>

            <form onSubmit={handleSubmit} className="login-form">
              {message && <div className="alert success">{message}</div>}
              {error && <div className="alert error">{error}</div>}
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

              {isRegistering && (
                <div>
                  <label className="label">Full name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input"
                    placeholder="Your full name"
                  />
                </div>
              )}

              <div>
                <label className="label">Password</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input"
                    placeholder={isRegistering ? "Create a password" : "Enter your password"}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((s) => !s)}
                    className="btn"
                    style={{ padding: '6px 10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.8 21.8 0 0 1 5.07-6.55" />
                        <path d="M1 1l22 22" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn" disabled={loading}>{loading ? (isRegistering ? "Registering..." : "Signing...") : (isRegistering ? "Register" : "Sign In")}</button>

              <div style={{ marginTop: 8 }}>
                <button type="button" className="btn" onClick={() => { setIsRegistering(!isRegistering); setMessage(""); setError(""); }}>
                  {isRegistering ? "Back to sign in" : "New user? Register"}
                </button>
              </div>

              <div className="form-row">
                <label className="remember">
                  <input type="checkbox" />
                  Remember me
                </label>
                <a href="/forgot" className="forgot-link">Forgot password?</a>
              </div>
            </form>

            <div className="or-sep">or</div>
            <div id="g_id_signin"></div>

            <p className="footer">© 2026 Document Vault</p>
          </div>
        </div>
      </div>
    </div>
  );
}
