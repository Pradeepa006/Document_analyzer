import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import './navigation.css'

const Navigation = () => {
  const navigate = useNavigate()
  const [loggedIn, setLoggedIn] = useState(Boolean(localStorage.getItem('access_token')))

  useEffect(() => {
    const mobileToggle = document.getElementById('mobile-toggle')
    const mobileClose = document.getElementById('mobile-close')
    const mobileMenu = document.getElementById('mobile-menu')
    if (!mobileToggle || !mobileClose || !mobileMenu) return

    const openMenu = () => {
      mobileMenu.classList.add('is-open')
      mobileToggle.setAttribute('aria-expanded', 'true')
      document.body.style.overflow = 'hidden'
    }
    const closeMenu = () => {
      mobileMenu.classList.remove('is-open')
      mobileToggle.setAttribute('aria-expanded', 'false')
      document.body.style.overflow = ''
    }
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('is-open')) closeMenu()
    }
    const onResize = () => {
      if (window.innerWidth > 767 && mobileMenu.classList.contains('is-open')) closeMenu()
    }

    mobileToggle.addEventListener('click', openMenu)
    mobileClose.addEventListener('click', closeMenu)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onResize)
    document.querySelectorAll('.navigation-mobile-link').forEach((l) =>
      l.addEventListener('click', closeMenu)
    )

    return () => {
      mobileToggle.removeEventListener('click', openMenu)
      mobileClose.removeEventListener('click', closeMenu)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  // update loggedIn state when localStorage changes in other tabs/windows
  useEffect(() => {
    const onStorage = () => setLoggedIn(Boolean(localStorage.getItem('access_token')))
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const handleSignOut = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setLoggedIn(false)
    navigate('/')
  }
  return (
    <div className="navigation-container1">
      <nav id="main-nav" className="navigation-wrapper">
        <div className="navigation-container">
          <a href="/app">
            <div aria-label="DocuLift Homepage" className="navigation-brand">
              <div className="navigation-logo-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                  <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v12m5-7l-5-5l-5 5m14 7v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                </svg>
              </div>
              <span className="navigation-brand-name section-title">DocuLift</span>
            </div>
          </a>
          {/* desktop links omitted intentionally */}
          <div className="navigation-actions">
            {!loggedIn ? (
              <>
                <a href="/login">
                  <div className="navigation-link desktop-only"><span>Sign In</span></div>
                </a>
                <a href="/register">
                  <div className="btn btn-primary btn-sm"><span>Get Started</span></div>
                </a>
              </>
            ) : (
              <button className="btn btn-outline btn-sm" onClick={handleSignOut}>Sign out</button>
            )}

            <button id="mobile-toggle" aria-label="Open menu" aria-expanded="false" className="navigation-toggle">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            </button>
          </div>
        </div>
      </nav>

      <div id="mobile-menu" className="navigation-mobile-overlay">
        <div className="navigation-mobile-header">
          <a href="/app">
            <div aria-label="DocuLift Homepage" className="navigation-brand">
              <div className="navigation-logo-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                  <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v12m5-7l-5-5l-5 5m14 7v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                </svg>
              </div>
              <span className="navigation-brand-name section-title">DocuLift</span>
            </div>
          </a>
          <button id="mobile-close" aria-label="Close menu" className="navigation-close">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
              <path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1zm-5.5-3.5l-5 5m0-5l5 5"></path>
            </svg>
          </button>
        </div>

        <div className="navigation-mobile-content">
          <div className="navigation-mobile-links">
            <a href="/"><div className="navigation-mobile-link"><span>Platform</span></div></a>
            <a href="/"><div className="navigation-mobile-link"><span>Solutions</span></div></a>
            <a href="/"><div className="navigation-mobile-link"><span>Resources</span></div></a>
            <a href="/"><div className="navigation-mobile-link"><span>Pricing</span></div></a>
            {!loggedIn && (
              <a href="/login"><div className="navigation-mobile-link"><span>Sign In</span></div></a>
            )}
          </div>

          <div className="navigation-mobile-footer">
            {!loggedIn ? (
              <a href="/register"><div className="navigation-full-width btn btn-primary btn-lg"><span>Get Started Free</span></div></a>
            ) : (
              <button className="navigation-full-width btn btn-primary btn-lg" onClick={handleSignOut}>Sign Out</button>
            )}
          </div>
        </div>
      </div>

      <div className="navigation-container2">
        <div className="navigation-container3">
          <style>{`@media (prefers-reduced-motion: reduce) {
.navigation-mobile-overlay, .navigation-mobile-link {
  transition: none !important;
  transform: none !important;
  opacity: 1 !important;
}
}`}</style>
        </div>
      </div>
      <div className="navigation-container4">
        <div className="navigation-container5"></div>
      </div>
    </div>
  )
}

export default Navigation
