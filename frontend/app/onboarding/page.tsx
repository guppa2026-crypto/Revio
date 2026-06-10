'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

export default function OnboardingPage() {
  const router = useRouter()
  const [connecting, setConnecting] = useState(false)

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
    .nav-dot { width: 9px; height: 9px; border-radius: 50%; background: linear-gradient(135deg, #9A8FF0, #7F77DD); }
    .title { font-size: 22px; font-weight: 600; margin-bottom: 6px; }
    .sub { font-size: 15px; color: #5F5E5A; margin-bottom: 2rem; line-height: 1.5; }
    .steps { display: flex; flex-direction: column; gap: 0; margin-bottom: 2rem; }
    .step { display: flex; gap: 16px; align-items: flex-start; padding: 16px 0; border-bottom: 1px solid #F1EFE8; }
    .step:last-child { border-bottom: none; }
    .step-num { width: 28px; height: 28px; border-radius: 8px; background: linear-gradient(135deg, #EFEDFB, #E3DEFA); color: #6A61C9; font-size: 13px; font-weight: 600; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
    .step-done { background: #EAF3DE; color: #3B6D11; }
    .step-body h3 { font-size: 15px; font-weight: 600; margin-bottom: 3px; }
    .step-body p { font-size: 13px; color: #9E9B93; line-height: 1.5; }
    .btn-primary { width: 100%; font-size: 15px; font-weight: 500; color: #fff; background: #1A1916; padding: 13px; border-radius: 10px; border: none; cursor: pointer; font-family: inherit; transition: background 0.15s; margin-bottom: 10px; }
    .btn-primary:hover { background: #333; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-ghost { width: 100%; font-size: 14px; font-weight: 500; color: #888; background: transparent; padding: 10px; border-radius: 10px; border: none; cursor: pointer; font-family: inherit; }
    .btn-ghost:hover { color: #444; }
    .google-icon { margin-right: 8px; }
  `

  return (
    <>
      <style>{css}</style>
      <div className="shell">
        <div className="card">
          <div className="logo"><span className="nav-dot" />Revio</div>
          <div className="title">Welcome to Revio 👋</div>
          <p className="sub">Two steps to get AI replies on your Google reviews. Revio manages one Google Business Profile location per account.</p>

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
          <button className="btn-ghost" onClick={() => router.push('/dashboard')}>
            Skip for now → go to dashboard
          </button>
        </div>
      </div>
    </>
  )
}
