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
    .shell { min-height: 100vh; background: #F7F6F3; font-family: system-ui, -apple-system, sans-serif; color: #1A1916; overflow-x: hidden; }
    a { text-decoration: none; color: inherit; }

    @keyframes fadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
    @keyframes floatIn { from { opacity: 0; transform: translateY(28px) scale(0.98); } to { opacity: 1; transform: none; } }
    .anim { opacity: 0; animation: fadeUp 0.7s cubic-bezier(0.16,1,0.3,1) forwards; }
    .d1 { animation-delay: 0.05s; } .d2 { animation-delay: 0.15s; } .d3 { animation-delay: 0.25s; } .d4 { animation-delay: 0.35s; }

    .nav { background: rgba(247,246,243,0.8); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid #ECEAE4; padding: 0 2rem; height: 56px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 20; }
    .nav-logo { font-size: 17px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
    .nav-dot { width: 9px; height: 9px; border-radius: 50%; background: linear-gradient(135deg, #9A8FF0, #7F77DD); box-shadow: 0 0 0 3px rgba(127,119,221,0.15); }
    .nav-links { display: flex; align-items: center; gap: 8px; }
    .nav-login { font-size: 14px; color: #4A4844; padding: 8px 12px; border-radius: 8px; }
    .nav-login:hover { background: #F1EFE8; }
    .nav-cta { font-size: 14px; font-weight: 500; color: #fff; background: #1A1916; padding: 8px 16px; border-radius: 9px; transition: transform 0.15s, background 0.15s; }
    .nav-cta:hover { background: #333; transform: translateY(-1px); }

    .wrap { max-width: 1040px; margin: 0 auto; padding: 0 1.5rem; position: relative; }

    .hero-bg { position: absolute; top: -120px; left: 50%; transform: translateX(-50%); width: 900px; height: 600px; background: radial-gradient(ellipse at center, rgba(127,119,221,0.18), rgba(127,119,221,0) 60%); pointer-events: none; z-index: 0; }
    .hero { padding: 5rem 0 4rem; text-align: center; position: relative; z-index: 1; }
    .badge { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; color: #5A52B5; background: #EFEDFB; border: 1px solid #E0DCFA; padding: 6px 14px; border-radius: 99px; margin-bottom: 1.75rem; }
    .badge-stars { color: #E8A33D; letter-spacing: 1px; }
    .hero h1 { font-size: clamp(36px, 5.5vw, 58px); line-height: 1.06; font-weight: 600; letter-spacing: -0.025em; max-width: 740px; margin: 0 auto; }
    .grad { background: linear-gradient(120deg, #7F77DD, #B3A0F2); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .hero p { font-size: clamp(16px, 2vw, 19px); color: #5F5E5A; max-width: 560px; margin: 1.5rem auto 0; line-height: 1.55; }
    .hero-actions { display: flex; gap: 12px; justify-content: center; margin-top: 2.25rem; flex-wrap: wrap; }
    .btn-primary { font-size: 15px; font-weight: 500; color: #fff; background: #1A1916; padding: 14px 28px; border-radius: 11px; box-shadow: 0 4px 14px rgba(26,25,22,0.18); transition: transform 0.15s, box-shadow 0.15s; }
    .btn-primary:hover { background: #333; transform: translateY(-2px); box-shadow: 0 8px 22px rgba(26,25,22,0.24); }
    .btn-ghost { font-size: 15px; font-weight: 500; color: #1A1916; background: #fff; border: 1px solid #ECEAE4; padding: 14px 28px; border-radius: 11px; transition: border-color 0.15s, transform 0.15s; }
    .btn-ghost:hover { border-color: #C9C5BC; transform: translateY(-2px); }
    .hero-note { font-size: 13px; color: #9E9B93; margin-top: 1.25rem; }

    .preview { max-width: 540px; margin: 3.5rem auto 0; background: #fff; border: 1px solid #ECEAE4; border-radius: 18px; padding: 22px; text-align: left; box-shadow: 0 2px 6px rgba(26,25,22,0.04), 0 24px 60px rgba(26,25,22,0.10); position: relative; z-index: 1; animation: floatIn 0.9s cubic-bezier(0.16,1,0.3,1) 0.35s both; }
    .pv-review { display: flex; gap: 12px; }
    .pv-avatar { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #E8D9C4, #D6B894); flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; color: #7A5A2E; }
    .pv-name { font-size: 14px; font-weight: 600; }
    .pv-stars { color: #E8A33D; font-size: 13px; letter-spacing: 1px; margin-top: 1px; }
    .pv-text { font-size: 14px; color: #4A4844; line-height: 1.5; margin-top: 8px; }
    .pv-reply { margin-top: 16px; background: #FAF9F6; border: 1px solid #EFEDE7; border-left: 3px solid #7F77DD; border-radius: 10px; padding: 14px; }
    .pv-reply-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .pv-ai { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #7F77DD; background: #EFEDFB; padding: 2px 8px; border-radius: 6px; }
    .pv-reply-text { font-size: 13px; color: #4A4844; line-height: 1.55; }
    .pv-actions { display: flex; gap: 8px; margin-top: 14px; }
    .pv-approve { font-size: 13px; font-weight: 500; color: #fff; background: #1A1916; padding: 8px 16px; border-radius: 8px; }
    .pv-edit { font-size: 13px; font-weight: 500; color: #4A4844; background: #fff; border: 1px solid #ECEAE4; padding: 8px 16px; border-radius: 8px; }

    .section { padding: 4.5rem 0; position: relative; }
    .section-label { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #9E9B93; text-align: center; }
    .section-title { font-size: clamp(24px, 3vw, 34px); font-weight: 600; letter-spacing: -0.015em; text-align: center; margin-top: 10px; }

    .steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 2.75rem; }
    .step { background: #fff; border: 1px solid #ECEAE4; border-radius: 16px; padding: 26px; transition: transform 0.2s, box-shadow 0.2s; }
    .step:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(26,25,22,0.08); }
    .step-num { width: 32px; height: 32px; border-radius: 9px; background: linear-gradient(135deg, #EFEDFB, #E3DEFA); color: #6A61C9; font-size: 15px; font-weight: 600; display: flex; align-items: center; justify-content: center; }
    .step h3 { font-size: 16px; font-weight: 600; margin: 18px 0 8px; }
    .step p { font-size: 14px; color: #5F5E5A; line-height: 1.5; }

    .features { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px 28px; margin-top: 2.75rem; max-width: 780px; margin-left: auto; margin-right: auto; }
    .feature { font-size: 15px; color: #3A3934; display: flex; align-items: center; gap: 12px; }
    .feature-check { width: 22px; height: 22px; border-radius: 7px; background: #EAF3DE; color: #3B6D11; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

    .price-card { background: #fff; border: 1px solid #E0DCFA; border-radius: 18px; padding: 34px; max-width: 380px; margin: 2.75rem auto 0; box-shadow: 0 2px 6px rgba(26,25,22,0.04), 0 20px 50px rgba(127,119,221,0.14); }
    .price-name { font-size: 18px; font-weight: 600; }
    .price-amount { font-size: 44px; font-weight: 600; margin-top: 10px; letter-spacing: -0.02em; }
    .price-amount span { font-size: 15px; font-weight: 400; color: #9E9B93; letter-spacing: 0; }
    .price-list { margin: 22px 0; display: flex; flex-direction: column; gap: 12px; }
    .price-cta { display: block; text-align: center; font-size: 15px; font-weight: 500; color: #fff; background: #1A1916; padding: 14px; border-radius: 11px; transition: background 0.15s; }
    .price-cta:hover { background: #333; }

    .cta-band { background: linear-gradient(135deg, #1A1916, #2A2540); border-radius: 22px; padding: 4rem 2rem; text-align: center; margin: 2rem 0; position: relative; overflow: hidden; }
    .cta-band::before { content: ''; position: absolute; top: -80px; right: -40px; width: 320px; height: 320px; background: radial-gradient(circle, rgba(127,119,221,0.4), transparent 65%); pointer-events: none; }
    .cta-band h2 { color: #fff; font-size: clamp(24px, 3vw, 34px); font-weight: 600; position: relative; }
    .cta-band p { color: #B6B1C9; margin-top: 12px; font-size: 16px; position: relative; }
    .cta-band a { display: inline-block; margin-top: 1.75rem; background: #fff; color: #1A1916; font-size: 15px; font-weight: 500; padding: 14px 30px; border-radius: 11px; position: relative; transition: transform 0.15s; }
    .cta-band a:hover { transform: translateY(-2px); }

    .footer { border-top: 1px solid #ECEAE4; padding: 2rem 0; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
    .footer-brand { font-size: 14px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
    .footer-copy { font-size: 13px; color: #9E9B93; }

    @media (max-width: 720px) {
      .steps { grid-template-columns: 1fr; }
      .features { grid-template-columns: 1fr; gap: 14px; }
      .nav { padding: 0 1.25rem; }
    }
    @media (prefers-reduced-motion: reduce) {
      .anim, .preview { animation: none; opacity: 1; }
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

        <div className="wrap">
          <div className="hero-bg" />
          <header className="hero">
            <div className="badge anim d1"><span className="badge-stars">★★★★★</span> AI replies for your Google reviews</div>
            <h1 className="anim d2">Reply to every Google review, <span className="grad">automatically</span></h1>
            <p className="anim d3">Revio reads each new review, drafts a reply in your voice, and flags anything sensitive for you to check. Built for small UK businesses.</p>
            <div className="hero-actions anim d4">
              <a className="btn-primary" href={primaryHref}>{primaryLabel}</a>
              <a className="btn-ghost" href="#how">See how it works</a>
            </div>
            <div className="hero-note anim d4">£18/month · cancel anytime</div>

            <div className="preview">
              <div className="pv-review">
                <div className="pv-avatar">S</div>
                <div>
                  <div className="pv-name">Sarah M.</div>
                  <div className="pv-stars">★★★★☆</div>
                </div>
              </div>
              <div className="pv-text">Lovely coffee and friendly staff, though the wait was a little long at peak time.</div>
              <div className="pv-reply">
                <div className="pv-reply-head"><span className="pv-ai">Drafted by Revio</span></div>
                <div className="pv-reply-text">Thank you so much, Sarah. We are delighted you enjoyed the coffee and our team. We are working on speeding up service at busy times and hope to see you again soon.</div>
              </div>
              <div className="pv-actions">
                <span className="pv-approve">Approve &amp; post</span>
                <span className="pv-edit">Edit</span>
              </div>
            </div>
          </header>
        </div>

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
            <div className="feature"><span className="feature-check">✓</span>AI-powered review analysis</div>
            <div className="feature"><span className="feature-check">✓</span>Automated reply generation in your voice</div>
            <div className="feature"><span className="feature-check">✓</span>Email alerts for flagged reviews</div>
            <div className="feature"><span className="feature-check">✓</span>Approve, edit or reject every reply</div>
            <div className="feature"><span className="feature-check">✓</span>Google Reviews integration</div>
            <div className="feature"><span className="feature-check">✓</span>Risk-based handling, high-risk never auto-posts</div>
          </div>
        </section>

        <section className="section wrap">
          <div className="section-label">Pricing</div>
          <h2 className="section-title">One simple plan</h2>
          <div className="price-card">
            <div className="price-name">Revio Pro</div>
            <div className="price-amount">£18<span>/month inc VAT</span></div>
            <div className="price-list">
              <div className="feature"><span className="feature-check">✓</span>Unlimited reviews and AI replies</div>
              <div className="feature"><span className="feature-check">✓</span>Automated reply generation</div>
              <div className="feature"><span className="feature-check">✓</span>Email alerts for flagged reviews</div>
              <div className="feature"><span className="feature-check">✓</span>Google Reviews integration</div>
              <div className="feature"><span className="feature-check">✓</span>Rating goal calculator & live tracker</div>
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