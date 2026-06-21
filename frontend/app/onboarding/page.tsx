'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

const EXAMPLES = [
  {
    tab: '5-star',
    name: 'Sarah M.',
    avatar: 'S',
    review: 'Lovely coffee and really friendly staff, though the wait was a bit long at peak time.',
    reply: "Thank you so much, Sarah — we're really glad you enjoyed the coffee and found our team welcoming. We hear you on the wait times and are actively working on improving flow during busy periods. Hope to see you again soon!",
  },
  {
    tab: '3-star',
    name: 'Tom R.',
    avatar: 'T',
    review: 'Food was decent but our table wasn\'t ready 20 minutes after our booking time.',
    reply: "Tom, you're right to flag this — a 20 minute wait on a booking isn't the standard we hold ourselves to, and we're sorry it fell short. We've spoken to the team about tightening up table turnaround on busy evenings. We'd love another chance to get it right — hope to see you again soon.",
  },
  {
    tab: '1-star',
    name: 'Aisha K.',
    avatar: 'A',
    review: 'Ordered a refund two weeks ago and still haven\'t heard anything back. Really poor service.',
    reply: "Aisha, this is genuinely not okay, and we're sorry it's taken this long — a two week silence on a refund is on us, not you. We've reviewed how refund requests are being handled and are fixing the gap that let this slip through. Please reach out to us directly so we can sort this out for you right away.",
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [connecting, setConnecting] = useState(false)
  const [activeExample, setActiveExample] = useState(0)

  const handleConnectGoogle = async () => {
    setConnecting(true)
    try {
      const res = await api.get('/google/connect')
      window.location.href = res.data.auth_url
    } catch {
      setConnecting(false)
      alert('Failed to start Google connection.')
    }
  }

  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    .shell { min-height: 100vh; background: #F7F6F3; font-family: system-ui, -apple-system, sans-serif; color: #1A1916; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem 1.5rem; }
    .card { background: #fff; border: 1px solid #ECEAE4; border-radius: 20px; padding: 2.5rem; max-width: 520px; width: 100%; box-shadow: 0 2px 6px rgba(26,25,22,0.04), 0 16px 40px rgba(26,25,22,0.08); }
    .logo { display: flex; align-items: center; gap: 8px; font-size: 17px; font-weight: 600; margin-bottom: 2rem; }
    .nav-dot { width: 9px; height: 9px; border-radius: 50%; background: linear-gradient(135deg, #F2727B, #E10E1C); }
    .title { font-size: 22px; font-weight: 600; margin-bottom: 6px; }
    .sub { font-size: 15px; color: #5F5E5A; margin-bottom: 2rem; line-height: 1.5; }
    .steps { display: flex; flex-direction: column; gap: 0; margin-bottom: 2rem; }
    .step { display: flex; gap: 16px; align-items: flex-start; padding: 16px 0; border-bottom: 1px solid #F1EFE8; }
    .step:last-child { border-bottom: none; }
    .step-num { width: 28px; height: 28px; border-radius: 8px; background: linear-gradient(135deg, #FDECEC, #FBD6D8); color: #E10E1C; font-size: 13px; font-weight: 600; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
    .step-done { background: #EAF3DE; color: #3B6D11; }
    .step-body h3 { font-size: 15px; font-weight: 600; margin-bottom: 3px; }
    .step-body p { font-size: 13px; color: #9E9B93; line-height: 1.5; }
    .btn-primary { width: 100%; font-size: 15px; font-weight: 500; color: #fff; background: #1A1916; padding: 13px; border-radius: 10px; border: none; cursor: pointer; font-family: inherit; transition: background 0.15s; margin-bottom: 10px; }
    .btn-primary:hover { background: #333; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-ghost { width: 100%; font-size: 14px; font-weight: 500; color: #888; background: transparent; padding: 10px; border-radius: 10px; border: none; cursor: pointer; font-family: inherit; }
    .btn-ghost:hover { color: #444; }
    .google-icon { margin-right: 8px; }
    .preview { background: #FAF9F6; border: 1px solid #ECEAE4; border-radius: 12px; padding: 16px; margin-bottom: 2rem; }
    .preview-label-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    .preview-label { font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #9E9B93; }
    .preview-tabs { display: flex; gap: 6px; }
    .preview-tab { font-size: 11px; font-weight: 600; padding: 4px 9px; border-radius: 999px; border: 1px solid #ECEAE4; background: #fff; color: #9E9B93; cursor: pointer; font-family: inherit; }
    .preview-tab.active { background: #1A1916; color: #fff; border-color: #1A1916; }
    .preview-review { display: flex; gap: 10px; margin-bottom: 10px; }
    .preview-avatar { width: 28px; height: 28px; border-radius: 50%; background: #EEF2FF; color: #4F46E5; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
    .preview-name { font-size: 13px; font-weight: 600; margin-bottom: 2px; }
    .preview-text { font-size: 12px; color: #5A5754; line-height: 1.5; }
    .preview-reply { background: #fff; border-left: 3px solid #E10E1C; border-radius: 0 8px 8px 0; padding: 10px 12px; }
    .preview-reply-tag { font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #E10E1C; margin-bottom: 5px; }
    .preview-reply-text { font-size: 12px; color: #3A3834; line-height: 1.55; }
    .connect-hint { font-size: 12px; color: #9E9B93; text-align: center; margin-top: 4px; margin-bottom: 14px; }
  `

  return (
    <>
      <style>{css}</style>
      <div className="shell">
        <div className="card">
          <div className="logo"><span className="nav-dot" />Revio</div>
          <div className="title">Welcome to Revio 👋</div>
          <p className="sub">Two steps to get AI replies on your Google reviews. Revio manages one Google Business Profile location per account.</p>

          <div className="preview">
            <div className="preview-label-row">
              <div className="preview-label">What you'll get</div>
              <div className="preview-tabs">
                {EXAMPLES.map((ex, i) => (
                  <button
                    key={ex.tab}
                    type="button"
                    className={`preview-tab${i === activeExample ? ' active' : ''}`}
                    onClick={() => setActiveExample(i)}
                  >
                    {ex.tab}
                  </button>
                ))}
              </div>
            </div>
            <div className="preview-review">
              <div className="preview-avatar">{EXAMPLES[activeExample].avatar}</div>
              <div>
                <div className="preview-name">{EXAMPLES[activeExample].name}</div>
                <div className="preview-text">{EXAMPLES[activeExample].review}</div>
              </div>
            </div>
            <div className="preview-reply">
              <div className="preview-reply-tag">Drafted by Revio</div>
              <div className="preview-reply-text">{EXAMPLES[activeExample].reply}</div>
            </div>
          </div>

          <div className="steps">
            <div className="step">
              <div className="step-num step-done">✓</div>
              <div className="step-body">
                <h3>Account created</h3>
                <p>Your Revio account is ready to go.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-num">2</div>
              <div className="step-body">
                <h3>Connect your Google Business Profile</h3>
                <p>Revio needs access to read your reviews and post replies on your behalf.</p>
              </div>
            </div>
            <div className="step">
              <div className="step-num">3</div>
              <div className="step-body">
                <h3>Subscribe to go live</h3>
                <p>£18/month — cancel anytime. Reviews start syncing as soon as you subscribe.</p>
              </div>
            </div>
          </div>

          <button className="btn-primary" onClick={handleConnectGoogle} disabled={connecting}>
            <span className="google-icon">G</span>
            {connecting ? 'Opening Google…' : 'Connect Google Business Profile'}
          </button>
          <div className="connect-hint">Takes under a minute · We only request reply-management access</div>
          <button className="btn-ghost" onClick={() => router.push('/dashboard')}>
            Skip for now → go to dashboard
          </button>
        </div>
      </div>
    </>
  )
}
