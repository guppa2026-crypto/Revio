'use client'
import { useEffect, useState } from 'react'
import { Star, Shield, Zap, CheckCircle, ArrowRight, Mail, Lock, MessageSquare, ChevronDown } from 'lucide-react'

const FAQS = [
  {
    q: 'Is auto-posting reviews safe?',
    a: 'Every review is scored for risk before anything happens. Negative, mixed, or sensitive reviews are always held for your approval — Revio never auto-posts those. Only straightforward 4-5 star reviews are scheduled to post automatically, and even then you get a 24-hour window to review, edit, or cancel the reply from your dashboard before it goes live.',
  },
  {
    q: 'How does Revio decide what to say?',
    a: "Each reply is generated for that specific review — referencing what the customer actually praised or complained about — rather than picking from a generic template. You can edit any drafted reply, or regenerate it, before it's posted.",
  },
  {
    q: 'What happens with negative reviews?',
    a: 'Revio drafts a thoughtful, specific reply — acknowledging what went wrong and what you\'re doing about it — but it always waits in your dashboard for your approval. We never post on your behalf for a negative or high-risk review without you reviewing it first.',
  },
  {
    q: 'Is this compliant with Google\'s review policies?',
    a: 'Yes. Google explicitly allows AI-assisted and automated review replies, provided the account owner has given clear consent and retains the ability to review and edit. That\'s exactly how Revio works — you opt in when you connect your account, and every scheduled reply can be edited or cancelled before it posts.',
  },
  {
    q: 'What data does Revio access, and how secure is it?',
    a: "Connecting your Google Business Profile uses Google's standard OAuth login. Google only offers one permission scope for managing review replies via its API, and that's what we request — we don't use it to touch your business hours, listing photos, or anything else. Your access tokens are encrypted at rest in our database. You can revoke access at any time from your Google Account or by disconnecting in your Revio dashboard. We don't sell your data or use it for advertising. See the full Privacy Policy for details.",
  },
]

export default function HomePage() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  useEffect(() => {
    setLoggedIn(!!localStorage.getItem('token'))
  }, [])

  const primaryHref = loggedIn ? '/dashboard' : '/register'
  const primaryLabel = loggedIn ? 'Go to dashboard' : 'Get started'

  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body { background: #FAFAF8; }
    .shell { min-height: 100vh; background: #FAFAF8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111110; overflow-x: hidden; }
    a { text-decoration: none; color: inherit; }

    /* NAV */
    .nav { background: rgba(250,250,248,0.85); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-bottom: 1px solid #ECEAE4; padding: 0 2.5rem; height: 60px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 50; }
    .nav-logo { font-size: 18px; font-weight: 800; color: #111110; letter-spacing: -0.03em; display: flex; align-items: center; gap: 8px; }
    .logo-mark { width: 26px; height: 26px; background: #111110; border-radius: 7px; display: flex; align-items: center; justify-content: center; }
    .logo-mark svg { color: #fff; }
    .nav-links { display: flex; align-items: center; gap: 6px; }
    .nav-login { font-size: 14px; font-weight: 500; color: #6B6963; padding: 8px 14px; border-radius: 8px; transition: color 0.15s; }
    .nav-login:hover { color: #111110; }
    .nav-cta { font-size: 14px; font-weight: 600; color: #fff; background: #111110; padding: 9px 18px; border-radius: 9px; display: flex; align-items: center; gap: 6px; transition: background 0.15s; }
    .nav-cta:hover { background: #2D2D2A; }

    /* HERO */
    .hero-wrap { max-width: 1100px; margin: 0 auto; padding: 5rem 2.5rem 4rem; display: grid; grid-template-columns: 1fr 1fr; gap: 5rem; align-items: center; }
    .hero-left { }
    .hero-tag { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #5B52CC; background: #EEEDFB; border: 1px solid #D8D4F8; padding: 5px 12px; border-radius: 99px; margin-bottom: 1.75rem; }
    .hero-tag-dot { width: 6px; height: 6px; border-radius: 50%; background: #5B52CC; }
    .hero-h1 { font-size: clamp(38px, 4.5vw, 58px); font-weight: 800; line-height: 1.05; letter-spacing: -0.035em; color: #111110; margin-bottom: 1.25rem; }
    .hero-h1 em { font-style: normal; color: #5B52CC; }
    .hero-sub { font-size: 17px; color: #6B6963; line-height: 1.65; max-width: 440px; margin-bottom: 2rem; }
    .hero-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 1.25rem; }
    .btn-dark { font-size: 15px; font-weight: 600; color: #fff; background: #111110; padding: 13px 24px; border-radius: 10px; display: flex; align-items: center; gap: 8px; transition: background 0.15s, transform 0.15s; box-shadow: 0 1px 2px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.12); }
    .btn-dark:hover { background: #2D2D2A; transform: translateY(-1px); }
    .btn-light { font-size: 15px; font-weight: 500; color: #4A4844; background: #fff; border: 1px solid #E0DED7; padding: 13px 24px; border-radius: 10px; transition: border-color 0.15s; }
    .btn-light:hover { border-color: #C0BDB5; }
    .hero-note { font-size: 13px; color: #A8A49C; }

    /* PREVIEW */
    .preview-wrap { position: relative; }
    .preview-card { background: #fff; border: 1px solid #E5E3DC; border-radius: 18px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.04), 0 20px 60px rgba(0,0,0,0.1); }
    .preview-topbar { background: #F5F4F1; border-bottom: 1px solid #ECEAE4; padding: 10px 16px; display: flex; align-items: center; gap: 6px; }
    .dot { width: 10px; height: 10px; border-radius: 50%; }
    .dot-red { background: #FF5F57; }
    .dot-yellow { background: #FFBD2E; }
    .dot-green { background: #28C840; }
    .preview-body { padding: 20px; }
    .preview-review { display: flex; gap: 12px; margin-bottom: 14px; }
    .preview-avatar { width: 36px; height: 36px; border-radius: 50%; background: #EEF2FF; color: #4F46E5; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; }
    .preview-meta { flex: 1; }
    .preview-name { font-size: 14px; font-weight: 600; color: #111110; margin-bottom: 3px; }
    .preview-stars { display: flex; gap: 1px; margin-bottom: 6px; }
    .preview-text { font-size: 13px; color: #5A5754; line-height: 1.55; }
    .preview-reply { background: #F5F4F1; border-left: 3px solid #5B52CC; border-radius: 0 10px 10px 0; padding: 13px 15px; margin-top: 14px; }
    .preview-reply-tag { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #5B52CC; margin-bottom: 7px; }
    .preview-reply-text { font-size: 13px; color: #3A3834; line-height: 1.6; }
    .preview-actions { display: flex; gap: 8px; margin-top: 14px; }
    .preview-btn-approve { font-size: 13px; font-weight: 600; color: #fff; background: #111110; padding: 8px 16px; border-radius: 8px; }
    .preview-btn-edit { font-size: 13px; font-weight: 500; color: #6B6963; background: #fff; border: 1px solid #E5E3DC; padding: 8px 16px; border-radius: 8px; }
    .preview-badge { position: absolute; top: -12px; right: -12px; background: #fff; border: 1px solid #E5E3DC; border-radius: 12px; padding: 10px 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); font-size: 13px; font-weight: 600; color: #111110; display: flex; align-items: center; gap: 8px; white-space: nowrap; }
    .preview-badge-dot { width: 8px; height: 8px; border-radius: 50%; background: #22C55E; box-shadow: 0 0 0 3px rgba(34,197,94,0.2); }

    /* DIVIDER */
    .divider { max-width: 1100px; margin: 0 auto; padding: 0 2.5rem; }
    .divider-line { border: none; border-top: 1px solid #ECEAE4; }

    /* HOW IT WORKS */
    .how-wrap { max-width: 1100px; margin: 0 auto; padding: 5rem 2.5rem; }
    .section-eyebrow { font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #A8A49C; margin-bottom: 1rem; }
    .section-h2 { font-size: clamp(28px, 3vw, 40px); font-weight: 800; letter-spacing: -0.03em; color: #111110; margin-bottom: 3.5rem; max-width: 480px; line-height: 1.15; }
    .steps-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; background: #E8E6E0; border-radius: 16px; overflow: hidden; }
    .step { background: #fff; padding: 32px 28px; }
    .step-number { font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: #A8A49C; margin-bottom: 24px; }
    .step-icon { width: 40px; height: 40px; border-radius: 11px; background: #F5F4F1; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; color: #5B52CC; }
    .step h3 { font-size: 17px; font-weight: 700; color: #111110; margin-bottom: 10px; letter-spacing: -0.01em; }
    .step p { font-size: 14px; color: #6B6963; line-height: 1.65; }

    /* FEATURES */
    .features-wrap { max-width: 1100px; margin: 0 auto; padding: 1rem 2.5rem 5rem; }
    .features-intro { font-size: 16px; color: #6B6963; line-height: 1.6; max-width: 560px; margin-top: -2.5rem; margin-bottom: 0; }
    .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 3rem; }
    .feature-card { background: #fff; border: 1px solid #E8E6E0; border-radius: 16px; padding: 28px; }
    .feature-icon { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 18px; }
    .feature-icon-purple { background: #EEEDFB; color: #5B52CC; }
    .feature-icon-green { background: #DCFCE7; color: #16A34A; }
    .feature-icon-amber { background: #FEF3C7; color: #D97706; }
    .feature-card h3 { font-size: 16px; font-weight: 700; color: #111110; margin-bottom: 8px; letter-spacing: -0.01em; }
    .feature-card p { font-size: 14px; color: #6B6963; line-height: 1.65; }

    /* TRUST */
    .trust-wrap { max-width: 1100px; margin: 0 auto; padding: 1rem 2.5rem 5rem; }
    .trust-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 3rem; }
    .trust-card { background: #fff; border: 1px solid #E8E6E0; border-radius: 16px; padding: 28px; }
    .trust-icon { width: 42px; height: 42px; border-radius: 12px; background: #F5F4F1; color: #5B52CC; display: flex; align-items: center; justify-content: center; margin-bottom: 18px; }
    .trust-card h3 { font-size: 16px; font-weight: 700; color: #111110; margin-bottom: 8px; letter-spacing: -0.01em; }
    .trust-card p { font-size: 14px; color: #6B6963; line-height: 1.65; }
    .trust-card a { color: #5B52CC; font-weight: 600; }

    /* FAQ */
    .faq-wrap { max-width: 760px; margin: 0 auto; padding: 1rem 2.5rem 5rem; }
    .faq-item { border-bottom: 1px solid #E8E6E0; }
    .faq-q { width: 100%; text-align: left; background: none; border: none; cursor: pointer; padding: 22px 0; display: flex; align-items: center; justify-content: space-between; gap: 16px; font-family: inherit; font-size: 16px; font-weight: 600; color: #111110; letter-spacing: -0.01em; }
    .faq-q svg { flex-shrink: 0; color: #A8A49C; transition: transform 0.2s; }
    .faq-q[aria-expanded="true"] svg { transform: rotate(180deg); }
    .faq-a { font-size: 14px; color: #6B6963; line-height: 1.7; padding: 0 0 22px; max-width: 640px; }

    /* PRICING */
    .pricing-wrap { max-width: 1100px; margin: 0 auto; padding: 0 2.5rem 5rem; }
    .pricing-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: center; }
    .pricing-left h2 { font-size: clamp(28px, 3vw, 40px); font-weight: 800; letter-spacing: -0.03em; color: #111110; margin-bottom: 12px; line-height: 1.15; }
    .pricing-left p { font-size: 16px; color: #6B6963; line-height: 1.65; }
    .price-card { background: #111110; border-radius: 20px; padding: 36px; color: #fff; }
    .price-label { font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255,255,255,0.4); margin-bottom: 16px; }
    .price-amount { font-size: 52px; font-weight: 800; letter-spacing: -0.04em; line-height: 1; }
    .price-period { font-size: 15px; font-weight: 400; color: rgba(255,255,255,0.45); margin-left: 4px; }
    .price-vat { font-size: 12px; color: rgba(255,255,255,0.35); margin-top: 4px; margin-bottom: 28px; }
    .price-features { display: flex; flex-direction: column; gap: 12px; margin-bottom: 28px; }
    .price-feature { display: flex; align-items: center; gap: 10px; font-size: 14px; color: rgba(255,255,255,0.75); }
    .price-check { width: 18px; height: 18px; border-radius: 50%; background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .price-check svg { color: rgba(255,255,255,0.6); }
    .price-cta { display: block; text-align: center; font-size: 15px; font-weight: 700; color: #111110; background: #fff; padding: 14px; border-radius: 11px; transition: opacity 0.15s; }
    .price-cta:hover { opacity: 0.9; }

    /* CTA BAND */
    .cta-wrap { max-width: 1100px; margin: 0 auto; padding: 0 2.5rem 5rem; }
    .cta-band { background: #111110; border-radius: 20px; padding: 4.5rem 3rem; text-align: center; position: relative; overflow: hidden; }
    .cta-band::before { content: ''; position: absolute; top: -100px; left: 50%; transform: translateX(-50%); width: 500px; height: 400px; background: radial-gradient(ellipse at center, rgba(91,82,204,0.35), transparent 65%); pointer-events: none; }
    .cta-band h2 { font-size: clamp(26px, 3.5vw, 42px); font-weight: 800; color: #fff; letter-spacing: -0.03em; line-height: 1.1; margin-bottom: 14px; position: relative; }
    .cta-band p { font-size: 16px; color: rgba(255,255,255,0.5); margin-bottom: 2rem; position: relative; }
    .cta-band a { display: inline-flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 700; color: #111110; background: #fff; padding: 14px 28px; border-radius: 11px; position: relative; transition: opacity 0.15s; }
    .cta-band a:hover { opacity: 0.9; }

    /* FOOTER */
    .footer-wrap { max-width: 1100px; margin: 0 auto; padding: 0 2.5rem; }
    .footer { border-top: 1px solid #E8E6E0; padding: 2.25rem 0; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
    .footer-logo { font-size: 15px; font-weight: 800; letter-spacing: -0.02em; color: #111110; display: flex; align-items: center; gap: 8px; }
    .footer-links { display: flex; align-items: center; gap: 20px; }
    .footer-link { font-size: 13px; color: #A8A49C; transition: color 0.15s; }
    .footer-link:hover { color: #6B6963; }

    @media (max-width: 860px) {
      .hero-wrap { grid-template-columns: 1fr; gap: 3rem; padding: 3rem 1.5rem; }
      .preview-badge { display: none; }
      .steps-grid { grid-template-columns: 1fr; }
      .features-grid { grid-template-columns: 1fr; }
      .trust-grid { grid-template-columns: 1fr; }
      .pricing-inner { grid-template-columns: 1fr; gap: 2rem; }
      .how-wrap, .features-wrap, .trust-wrap, .faq-wrap, .pricing-wrap, .cta-wrap, .footer-wrap, .divider { padding-left: 1.5rem; padding-right: 1.5rem; }
      .nav { padding: 0 1.5rem; }
    }
  `

  return (
    <>
      <style>{css}</style>
      <div className="shell">

        {/* NAV */}
        <nav className="nav">
          <div className="nav-logo">
            <div className="logo-mark"><Star size={13} fill="white" /></div>
            Revio
          </div>
          <div className="nav-links">
            <a className="nav-login" href="/login">Log in</a>
            <a className="nav-cta" href={primaryHref}>
              {primaryLabel} <ArrowRight size={14} />
            </a>
          </div>
        </nav>

        {/* HERO */}
        <div className="hero-wrap">
          <div className="hero-left">
            <div className="hero-tag">
              <span className="hero-tag-dot" />
              For UK small businesses
            </div>
            <h1 className="hero-h1">
              Your Google reviews,<br />
              replied to <em>automatically.</em>
            </h1>
            <p className="hero-sub">
              Connect once. Revio reads every new review, writes a reply in your tone, and posts it — or holds it for your approval if anything looks off.
            </p>
            <div className="hero-actions">
              <a className="btn-dark" href={primaryHref}>
                {primaryLabel} <ArrowRight size={15} />
              </a>
              <a className="btn-light" href="#how">See how it works</a>
            </div>
            <div className="hero-note">£18/month · no setup fee · cancel anytime</div>
          </div>

          <div className="preview-wrap">
            <div className="preview-badge">
              <span className="preview-badge-dot" />
              Reply posted to Google
            </div>
            <div className="preview-card">
              <div className="preview-topbar">
                <div className="dot dot-red" />
                <div className="dot dot-yellow" />
                <div className="dot dot-green" />
              </div>
              <div className="preview-body">
                <div className="preview-review">
                  <div className="preview-avatar">S</div>
                  <div className="preview-meta">
                    <div className="preview-name">Sarah M.</div>
                    <div className="preview-stars">
                      {[1,2,3,4].map(n => <Star key={n} size={12} fill="#F59E0B" color="#F59E0B" />)}
                      <Star size={12} fill="none" color="#E5E3DC" />
                    </div>
                    <div className="preview-text">Lovely coffee and really friendly staff, though the wait was a bit long at peak time.</div>
                  </div>
                </div>
                <div className="preview-reply">
                  <div className="preview-reply-tag">Drafted by Revio</div>
                  <div className="preview-reply-text">Thank you so much, Sarah — we are really glad you enjoyed the coffee and found our team welcoming. We hear you on the wait times and are actively working on improving flow during busy periods. Hope to see you again soon!</div>
                </div>
                <div className="preview-actions">
                  <span className="preview-btn-approve">Approve &amp; post</span>
                  <span className="preview-btn-edit">Edit reply</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="divider"><hr className="divider-line" /></div>

        {/* HOW IT WORKS */}
        <div className="how-wrap" id="how">
          <div className="section-eyebrow">How it works</div>
          <h2 className="section-h2">From new review to posted reply in minutes</h2>
          <div className="steps-grid">
            <div className="step">
              <div className="step-number">01</div>
              <div className="step-icon"><Star size={18} /></div>
              <h3>Connect Google</h3>
              <p>Link your Google Business Profile in two clicks. Revio pulls in your existing reviews and watches for new ones.</p>
            </div>
            <div className="step">
              <div className="step-number">02</div>
              <div className="step-icon"><Zap size={18} /></div>
              <h3>Revio reads &amp; drafts</h3>
              <p>Each review is scored for sentiment and risk. A reply is drafted instantly, written in your tone.</p>
            </div>
            <div className="step">
              <div className="step-number">03</div>
              <div className="step-icon"><Shield size={18} /></div>
              <h3>Posts or waits</h3>
              <p>Low-risk reviews post automatically. Anything sensitive is held for your approval before going live.</p>
            </div>
          </div>
        </div>

        {/* FEATURES */}
        <div className="features-wrap">
          <div className="section-eyebrow">Why Revio</div>
          <h2 className="section-h2">Built to handle the edge cases</h2>
          <p className="features-intro">Built for UK small businesses — natural, human tone, safe-by-default, and simple enough for non-technical owners to trust.</p>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon feature-icon-purple"><Zap size={20} /></div>
              <h3>Replies in your voice</h3>
              <p>Every reply references the specific details of that review — what the customer praised or complained about — instead of a generic template.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon feature-icon-green"><Shield size={20} /></div>
              <h3>Safe by default</h3>
              <p>High-risk and sensitive reviews never auto-post. They wait in your dashboard with a flag until you decide what to say.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon feature-icon-amber"><Star size={20} /></div>
              <h3>Rating goal tracker</h3>
              <p>See exactly how many 5-star reviews you need to reach your next milestone — updated live from your real data.</p>
            </div>
          </div>
        </div>

        {/* TRUST */}
        <div className="trust-wrap">
          <div className="section-eyebrow">Why trust Revio</div>
          <h2 className="section-h2">New product, no shortcuts</h2>
          <div className="trust-grid">
            <div className="trust-card">
              <div className="trust-icon"><Mail size={20} /></div>
              <h3>You'll talk to the person who built it</h3>
              <p>No support ticket queue. Every message goes straight to the founder, and we usually reply within one business day. <a href="/contact">Get in touch</a>.</p>
            </div>
            <div className="trust-card">
              <div className="trust-icon"><Lock size={20} /></div>
              <h3>Your data isn't the product</h3>
              <p>We don't sell your data or use it for advertising, and we only use essential cookies. Payments are handled entirely by Stripe — we never see your card details. <a href="/legal">Read the policy</a>.</p>
            </div>
            <div className="trust-card">
              <div className="trust-icon"><MessageSquare size={20} /></div>
              <h3>See it before you commit</h3>
              <p>Want a walkthrough with your own reviews before connecting your Google account? <a href="/contact">Ask for a live demo</a> — no obligation, no card required.</p>
            </div>
          </div>
        </div>

        <div className="divider"><hr className="divider-line" /></div>

        {/* FAQ */}
        <div className="faq-wrap">
          <div className="section-eyebrow">FAQ</div>
          <h2 className="section-h2">Questions you'd ask before connecting your account</h2>
          {FAQS.map((item, i) => (
            <div className="faq-item" key={item.q}>
              <button
                className="faq-q"
                aria-expanded={openFaq === i}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                {item.q}
                <ChevronDown size={18} />
              </button>
              {openFaq === i && <div className="faq-a">{item.a}</div>}
            </div>
          ))}
        </div>

        <div className="divider"><hr className="divider-line" /></div>

        {/* PRICING */}
        <div className="pricing-wrap" style={{paddingTop: '5rem'}}>
          <div className="pricing-inner">
            <div className="pricing-left">
              <div className="section-eyebrow">Pricing</div>
              <h2>One plan.<br />No surprises.</h2>
              <p>Everything you need to stay on top of your Google reviews. One business location, unlimited reviews, cancel any time.</p>
            </div>
            <div className="price-card">
              <div className="price-label">Revio Pro</div>
              <div className="price-amount">£18<span className="price-period">/month</span></div>
              <div className="price-vat">inc. VAT</div>
              <div className="price-features">
                {[
                  'One Google Business Profile location',
                  'Unlimited reviews & AI replies',
                  'Automated reply generation',
                  'Email alerts for flagged reviews',
                  'Rating goal tracker & calculator',
                  'Risk-based auto-post controls',
                ].map(f => (
                  <div key={f} className="price-feature">
                    <div className="price-check"><CheckCircle size={11} /></div>
                    {f}
                  </div>
                ))}
              </div>
              <a className="price-cta" href={primaryHref}>{primaryLabel}</a>
            </div>
          </div>
        </div>

        {/* CTA BAND */}
        <div className="cta-wrap">
          <div className="cta-band">
            <h2>Stop letting reviews<br />go unanswered.</h2>
            <p>Set Revio up once. Let it handle the replies.</p>
            <a href={primaryHref}>{primaryLabel} <ArrowRight size={15} /></a>
          </div>
        </div>

        {/* FOOTER */}
        <div className="footer-wrap">
          <div className="footer">
            <div className="footer-logo">
              <div className="logo-mark"><Star size={11} fill="white" /></div>
              Revio
            </div>
            <div className="footer-links">
              <a className="footer-link" href="/legal">Terms &amp; Privacy</a>
              <a className="footer-link" href="/contact">Contact</a>
              <span className="footer-link">© 2026 Revio</span>
            </div>
          </div>
        </div>

      </div>
    </>
  )
}
