'use client'
import { useEffect, useState } from 'react'

export default function HomePage() {
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    setLoggedIn(!!localStorage.getItem('token'))
  }, [])

  const primaryHref = loggedIn ? '/dashboard' : '/register'
  const primaryLabel = loggedIn ? 'Go to dashboard' : 'Get started'

  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    .shell { min-height: 100vh; background: #F7F6F3; font-family: system-ui, -apple-system, sans-serif; color: #1A1916; }
    a { text-decoration: none; color: inherit; }

    .nav { background: #fff; border-bottom: 1px solid #ECEAE4; padding: 0 2rem; height: 56px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 10; }
    .nav-logo { font-size: 17px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
    .nav-dot { width: 8px; height: 8px; border-radius: 50%; background: #7F77DD; }
    .nav-links { display: flex; align-items: center; gap: 8px; }
    .nav-login { font-size: 14px; color: #4A4844; padding: 8px 12px; border-radius: 8px; }
    .nav-login:hover { background: #F1EFE8; }
    .nav-cta { font-size: 14px; font-weight: 500; color: #fff; background: #1A1916; padding: 8px 16px; border-radius: 9px; }
    .nav-cta:hover { background: #333; }

    .wrap { max-width: 1040px; margin: 0 auto; padding: 0 1.5rem; }

    .hero { padding: 6rem 0 5rem; text-align: center; }
    .hero h1 { font-size: clamp(34px, 5.5vw, 54px); line-height: 1.08; font-weight: 600; letter-spacing: -0.02em; max-width: 720px; margin: 0 auto; }
    .hero p { font-size: clamp(16px, 2vw, 19px); color: #5F5E5A; max-width: 560px; margin: 1.5rem auto 0; line-height: 1.5; }
    .hero-actions { display: flex; gap: 12px; justify-content: center; margin-top: 2.25rem; flex-wrap: wrap; }
    .btn-primary { font-size: 15px; font-weight: 500; color: #fff; background: #1A1916; padding: 13px 26px; border-radius: 10px; }
    .btn-primary:hover { background: #333; }
    .btn-ghost { font-size: 15px; font-weight: 500; color: #1A1916; background: #fff; border: 1px solid #ECEAE4; padding: 13px 26px; border-radius: 10px; }
    .btn-ghost:hover { background: #fff; border-color: #D8D5CD; }
    .hero-note { font-size: 13px; color: #9E9B93; margin-top: 1.25rem; }

    .section { padding: 4rem 0; }
    .section-label { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #9E9B93; text-align: center; }
    .section-title { font-size: clamp(24px, 3vw, 32px); font-weight: 600; letter-spacing: -0.01em; text-align: center; margin-top: 10px; }

    .steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 2.5rem; }
    .step { background: #fff; border: 1px solid #ECEAE4; border-radius: 14px; padding: 24px; }
    .step-num { width: 28px; height: 28px; border-radius: 8px; background: #EFEDFB; color: #7F77DD; font-size: 14px; font-weight: 600; display: flex; align-items: center; justify-content: center; }
    .step h3 { font-size: 16px; font-weight: 600; margin: 16px 0 8px; }
    .step p { font-size: 14px; color: #5F5E5A; line-height: 1.5; }

    .features { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px 32px; margin-top: 2.5rem; max-width: 760px; margin-left: auto; margin-right: auto; }
    .feature { font-size: 15px; color: #4A4844; display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; }
    .feature::before { content: '✓'; color: #3B6D11; font-weight: 700; flex-shrink: 0; }

    .price-card { background: #fff; border: 1px solid #ECEAE4; border-radius: 16px; padding: 32px; max-width: 380px; margin: 2.5rem auto 0; }
    .price-name { font-size: 18px; font-weight: 600; }
    .price-amount { font-size: 40px; font-weight: 600; margin-top: 8px; }
    .price-amount span { font-size: 15px; font-weight: 400; color: #9E9B93; }
    .price-list { margin: 20px 0; display: flex; flex-direction: column; gap: 10px; }
    .price-list .feature { padding: 0; font-size: 14px; }
    .price-cta { display: block; text-align: center; font-size: 15px; font-weight: 500; color: #fff; background: #1A1916; padding: 13px; border-radius: 10px; }
    .price-cta:hover { background: #333; }

    .cta-band { background: #1A1916; border-radius: 18px; padding: 3.5rem 2rem; text-align: center; margin: 2rem 0; }
    .cta-band h2 { color: #fff; font-size: clamp(24px, 3vw, 32px); font-weight: 600; }
    .cta-band p { color: #B0ADA5; margin-top: 12px; font-size: 16px; }
    .cta-band a { display: inline-block; margin-top: 1.75rem; background: #fff; color: #1A1916; font-size: 15px; font-weight: 500; padding: 13px 28px; border-radius: 10px; }

    .footer { border-top: 1px solid #ECEAE4; padding: 2rem 0; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
    .footer-brand { font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
    .footer-copy { font-size: 13px; color: #9E9B93; }

    @media (max-width: 720px) {
      .steps { grid-template-columns: 1fr; }
      .features { grid-template-columns: 1fr; gap: 0; }
      .nav { padding: 0 1.25rem; }
    }
  `

  return (
    <>
      <style>{css}</style>
      <div className="shell">
        <nav className="nav">
          <div className="nav-logo"><span className="nav-dot" />Revio</div>
          <div className="nav-links">
            <a className="nav-login" href="/login">Log in</a>
            <a className="nav-cta" href={primaryHref}>{primaryLabel}</a>
          </div>
        </nav>

        <header className="hero wrap">
          <h1>Reply to every Google review, automatically</h1>
          <p>Revio reads each new review, drafts a reply in your voice, and flags anything sensitive for you to check. Built for small UK businesses.</p>
          <div className="hero-actions">
            <a className="btn-primary" href={primaryHref}>{primaryLabel}</a>
            <a className="btn-ghost" href="#how">See how it works</a>
          </div>
          <div className="hero-note">£18/month · cancel anytime</div>
        </header>

        <section className="section wrap" id="how">
          <div className="section-label">How it works</div>
          <h2 className="section-title">From new review to posted reply</h2>
          <div className="steps">
            <div className="step">
              <div className="step-num">1</div>
              <h3>Connect Google</h3>
              <p>Link your Google Business Profile in a couple of clicks. Revio pulls in your reviews automatically.</p>
            </div>
            <div className="step">
              <div className="step-num">2</div>
              <h3>Revio analyses</h3>
              <p>Every new review is scored for sentiment and risk by AI, then a reply is drafted in your tone.</p>
            </div>
            <div className="step">
              <div className="step-num">3</div>
              <h3>Approve or automate</h3>
              <p>Low-risk replies post on their own. Anything sensitive waits for your approval first.</p>
            </div>
          </div>
        </section>

        <section className="section wrap">
          <div className="section-label">Features</div>
          <h2 className="section-title">Everything you need to stay on top of reviews</h2>
          <div className="features">
            <div className="feature">AI-powered review analysis</div>
            <div className="feature">Automated reply generation in your voice</div>
            <div className="feature">Email alerts for flagged reviews</div>
            <div className="feature">Approve, edit or reject every reply</div>
            <div className="feature">Google Reviews integration</div>
            <div className="feature">Risk-based handling — high-risk never auto-posts</div>
          </div>
        </section>

        <section className="section wrap">
          <div className="section-label">Pricing</div>
          <h2 className="section-title">One simple plan</h2>
          <div className="price-card">
            <div className="price-name">Revio Pro</div>
            <div className="price-amount">£18<span>/month inc VAT</span></div>
            <div className="price-list">
              <div className="feature">Unlimited reviews and AI replies</div>
              <div className="feature">Automated reply generation</div>
              <div className="feature">Email alerts for flagged reviews</div>
              <div className="feature">Google Reviews integration</div>
            </div>
            <a className="price-cta" href={primaryHref}>{primaryLabel}</a>
          </div>
        </section>

        <section className="wrap">
          <div className="cta-band">
            <h2>Stop letting reviews pile up</h2>
            <p>Set Revio up once and let it handle the replies.</p>
            <a href={primaryHref}>{primaryLabel}</a>
          </div>
        </section>

        <footer className="wrap">
          <div className="footer">
            <div className="footer-brand"><span className="nav-dot" />Revio</div>
            <div className="footer-copy">© 2026 Revio · AI review management for UK businesses</div>
          </div>
        </footer>
      </div>
    </>
  )
}