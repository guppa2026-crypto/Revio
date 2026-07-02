'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Eye, EyeOff, Check } from 'lucide-react'
import api from '@/lib/api'

const FEATURES = [
  'AI replies written in your voice, not generic templates',
  'Risk-based auto-posting — sensitive reviews always held',
  '24-hour window to review, edit, or cancel before posting',
  'Rating goal tracker showing your next milestone',
  'Cancel anytime — no setup fee, no lock-in',
]

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/register', { name, email, password })
      router.push('/onboarding')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; }
    a { text-decoration: none; }

    .auth { min-height: 100vh; display: flex; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111110; }

    /* BRAND PANEL */
    .auth-brand {
      width: 420px; flex-shrink: 0;
      background: #111110;
      display: flex; flex-direction: column; justify-content: space-between;
      padding: 44px;
      position: sticky; top: 0; height: 100vh;
      overflow: hidden;
    }
    .auth-brand::before {
      content: ''; position: absolute; top: -140px; left: -80px;
      width: 500px; height: 500px;
      background: radial-gradient(ellipse, rgba(225,14,28,0.22), transparent 60%);
      pointer-events: none;
    }
    .auth-brand::after {
      content: ''; position: absolute; bottom: -80px; right: -80px;
      width: 400px; height: 340px;
      background: radial-gradient(ellipse, rgba(212,160,23,0.13), transparent 60%);
      pointer-events: none;
    }
    .auth-logo {
      display: flex; align-items: center; gap: 10px;
      font-size: 18px; font-weight: 800; color: #fff; letter-spacing: -0.02em;
      position: relative; text-decoration: none;
    }
    .auth-logo img { height: 24px; width: auto; }
    .auth-brand-body { position: relative; }
    .auth-headline {
      font-size: 26px; font-weight: 700; color: #fff; line-height: 1.3;
      letter-spacing: -0.025em; margin-bottom: 28px;
    }
    .auth-headline em { font-style: normal; color: #E10E1C; }
    .auth-bullets { display: flex; flex-direction: column; gap: 12px; margin-bottom: 26px; }
    .auth-bullet { display: flex; align-items: flex-start; gap: 12px; font-size: 14px; color: rgba(255,255,255,0.6); line-height: 1.55; }
    .auth-bullet-icon {
      width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0; margin-top: 1px;
      background: rgba(34,197,94,0.15); border: 1px solid rgba(34,197,94,0.3);
      color: #22C55E; display: flex; align-items: center; justify-content: center;
    }
    .auth-price {
      font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.3);
      padding-top: 18px; border-top: 1px solid rgba(255,255,255,0.08);
      letter-spacing: 0.01em;
    }
    .auth-foot { font-size: 12px; color: rgba(255,255,255,0.2); position: relative; }

    /* FORM PANEL */
    .auth-form-wrap {
      flex: 1; background: #FAFAF8;
      display: flex; align-items: center; justify-content: center;
      padding: 48px 28px;
    }
    .auth-box { width: 100%; max-width: 400px; }
    .auth-h { font-size: 28px; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 6px; }
    .auth-sub { font-size: 15px; color: #6B6963; margin-bottom: 36px; line-height: 1.5; }

    .auth-err {
      background: #FEF2F2; border: 1px solid #FECACA;
      color: #B91C1C; font-size: 13px; font-weight: 500;
      padding: 12px 14px; border-radius: 10px; margin-bottom: 20px;
    }
    .auth-field { margin-bottom: 18px; }
    .auth-field label { display: block; font-size: 13px; font-weight: 600; color: #3A3834; margin-bottom: 8px; }
    .auth-wrap { position: relative; }
    .auth-input {
      width: 100%; font-size: 15px; color: #111110; background: #fff;
      border: 1.5px solid #E0DED7; border-radius: 12px;
      padding: 13px 16px; font-family: inherit; outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .auth-input:focus { border-color: #111110; box-shadow: 0 0 0 3px rgba(17,17,16,0.06); }
    .auth-input.pw { padding-right: 52px; }
    .auth-pw-btn {
      position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
      background: none; border: none; cursor: pointer;
      color: #B8B4AC; padding: 4px; display: flex; align-items: center;
      transition: color 0.15s;
    }
    .auth-pw-btn:hover { color: #6B6963; }

    .auth-btn {
      width: 100%; font-size: 15px; font-weight: 700; color: #fff; background: #111110;
      border: none; border-radius: 12px; padding: 14px 20px;
      cursor: pointer; font-family: inherit;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      transition: background 0.15s, transform 0.1s;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
      margin-top: 8px;
    }
    .auth-btn:hover:not(:disabled) { background: #2D2D2A; transform: translateY(-1px); }
    .auth-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .auth-ftr { text-align: center; font-size: 14px; color: #6B6963; margin-top: 22px; }
    .auth-ftr a { color: #E10E1C; font-weight: 600; text-decoration: none; }
    .auth-ftr a:hover { text-decoration: underline; }
    .auth-legal { text-align: center; font-size: 12px; color: #A8A49C; margin-top: 14px; line-height: 1.6; }
    .auth-legal a { color: #6B6963; text-decoration: underline; }

    @media (max-width: 768px) {
      .auth-brand { display: none; }
      .auth-form-wrap { padding: 32px 20px; }
    }
  `

  return (
    <>
      <style>{css}</style>
      <div className="auth">

        <div className="auth-brand">
          <a className="auth-logo" href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/revio-icon.png" alt="" />
            Revio
          </a>
          <div className="auth-brand-body">
            <div className="auth-headline">
              Get your reviews under<br />control — for less than<br />a coffee <em>a week.</em>
            </div>
            <div className="auth-bullets">
              {FEATURES.map(f => (
                <div key={f} className="auth-bullet">
                  <div className="auth-bullet-icon"><Check size={12} /></div>
                  <span>{f}</span>
                </div>
              ))}
            </div>
            <div className="auth-price">£12.99/month · no setup fee · cancel anytime</div>
          </div>
          <div className="auth-foot">© 2026 Revio · reviodigital.uk</div>
        </div>

        <div className="auth-form-wrap">
          <div className="auth-box">
            <h1 className="auth-h">Create your account</h1>
            <p className="auth-sub">Start managing your Google reviews with AI. Takes 2 minutes to set up.</p>

            {error && <div className="auth-err">{error}</div>}

            <form onSubmit={handleRegister}>
              <div className="auth-field">
                <label>Business name</label>
                <input
                  className="auth-input"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. The Coffee Spot"
                  required
                  autoComplete="organization"
                />
              </div>
              <div className="auth-field">
                <label>Email address</label>
                <input
                  className="auth-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@yourbusiness.co.uk"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="auth-field">
                <label>Password</label>
                <div className="auth-wrap">
                  <input
                    className="auth-input pw"
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="8+ characters"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="auth-pw-btn"
                    onClick={() => setShowPw(s => !s)}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button className="auth-btn" type="submit" disabled={loading}>
                {loading ? 'Creating account…' : <>Create account <ArrowRight size={15} /></>}
              </button>
            </form>

            <p className="auth-ftr">
              Already have an account? <a href="/login">Sign in →</a>
            </p>
            <p className="auth-legal">
              By creating an account you agree to our{' '}
              <a href="/legal">Terms of Service</a> and{' '}
              <a href="/legal?tab=privacy">Privacy Policy</a>.
            </p>
          </div>
        </div>

      </div>
    </>
  )
}
