import { useState, useEffect } from "react";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({ email, password });
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
            <h2 className="hero-welcome">Welcome to</h2>
            <h1 className="hero-title">Document Vault</h1>
            <p className="hero-sub">Secure, searchable documents for your team.</p>
          </div>
        </div>

        <div className="login-panel">
          <div className="login-card">
            <h1 className="brand">Login</h1>
            <p className="tagline">Secure access to your workspace</p>

            <form onSubmit={handleSubmit} className="login-form">
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
                  placeholder="Enter your password"
                />
              </div>

              <button className="btn">Sign In</button>

              <div className="form-row">
                <label className="remember">
                  <input type="checkbox" />
                  Remember me
                </label>
                <a href="#/forgot" className="forgot-link">Forgot password?</a>
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
