import React from 'react'

import './footer.css'

const Footer = () => {
  return (
    <div className="footer-container1">
      <div className="footer-container2">
        <div className="footer-container3">
          <style>{`@media (prefers-reduced-motion: reduce) {
.footer-status-dot { animation: none; }
.footer-social-btn, .footer-link { transition: none; }
}`}</style>
        </div>
      </div>
      <footer className="footer-section">
        <div className="footer-container">
          <div className="footer-main-grid">
            <div className="footer-column footer-brand-info">
              <div className="footer-logo-wrapper">
                <div className="footer-logo-icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                  >
                    <g
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                    >
                      <path d="M12 3v12m5-7l-5-5l-5 5m14 7v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    </g>
                  </svg>
                </div>
                <span className="footer-logo-text">DocuLift</span>
              </div>
              <p className="footer-description section-content">
                Streamlining document management with secure, modern upload
                workflows for multi-member projects and verification.
              </p>
              <div className="footer-social-links">
                <a href="#">
                  <div aria-label="LinkedIn" className="footer-social-btn">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                    >
                      <g
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      >
                        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2a2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6M2 9h4v12H2z"></path>
                        <circle cx="4" cy="4" r="2"></circle>
                      </g>
                    </svg>
                  </div>
                </a>
                <a href="#">
                  <div aria-label="Twitter" className="footer-social-btn">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                    >
                      <path
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6c2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4c-.9-4.2 4-6.6 7-3.8c1.1 0 3-1.2 3-1.2"
                      ></path>
                    </svg>
                  </div>
                </a>
                <a href="#">
                  <div aria-label="GitHub" className="footer-social-btn">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                    >
                      <g
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                      >
                        <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5c.08-1.25-.27-2.48-1-3.5c.28-1.15.28-2.35 0-3.5c0 0-1 0-3 1.5c-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5c-.39.49-.68 1.05-.85 1.65S8.93 17.38 9 18v4"></path>
                        <path d="M9 18c-4.51 2-5-2-7-2"></path>
                      </g>
                    </svg>
                  </div>
                </a>
              </div>
            </div>
            <div className="footer-column">
              <h2 className="footer-column-title section-subtitle">Product</h2>
              <nav className="footer-nav">
                <ul className="footer-link-list">
                  <li className="footer-link-item">
                    <a href="Homepage">
                      <div className="footer-link">
                        <span>Home</span>
                      </div>
                    </a>
                  </li>
                  <li className="footer-link-item">
                    <a href="#">
                      <div className="footer-link">
                        <span>Document Upload</span>
                      </div>
                    </a>
                  </li>
                  <li className="footer-link-item">
                    <a href="#">
                      <div className="footer-link">
                        <span>Project Workflow</span>
                      </div>
                    </a>
                  </li>
                  <li className="footer-link-item">
                    <a href="#">
                      <div className="footer-link">
                        <span>Verification</span>
                      </div>
                    </a>
                  </li>
                </ul>
              </nav>
            </div>
            <div className="footer-column">
              <h2 className="footer-column-title section-subtitle">Company</h2>
              <nav className="footer-nav">
                <ul className="footer-link-list">
                  <li className="footer-link-item">
                    <a href="#">
                      <div className="footer-link">
                        <span>About Us</span>
                      </div>
                    </a>
                  </li>
                  <li className="footer-link-item">
                    <a href="#">
                      <div className="footer-link">
                        <span>Privacy Policy</span>
                      </div>
                    </a>
                  </li>
                  <li className="footer-link-item">
                    <a href="#">
                      <div className="footer-link">
                        <span>Terms of Service</span>
                      </div>
                    </a>
                  </li>
                  <li className="footer-link-item">
                    <a href="#">
                      <div className="footer-link">
                        <span>Contact Support</span>
                      </div>
                    </a>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-bottom-content">
              <p className="footer-copyright section-content">
                © 2026 DocuLift Inc. All rights reserved.
              </p>
              <div className="footer-status">
                <span className="footer-status-dot"></span>
                <span className="footer-status-text section-content">
                  All Systems Operational
                </span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Footer
