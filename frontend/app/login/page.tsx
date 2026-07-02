'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import api from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/login', { email, password })
      router.push('/dashboard')
    } catch {
      setError('Incorrect email or password. Please try again.')
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
      font-size: 27px; font-weight: 700; color: #fff; line-height: 1.3;
      letter-spacing: -0.025em; margin-bottom: 28px;
    }
    .auth-headline em { font-style: normal; color: #E10E1C; }
    .auth-card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.09);
      border-radius: 14px; padding: 22px 24px;
    }
    .auth-stars { font-size: 14px; color: #F59E0B; letter-spacing: 2px; margin-bottom: 12px; }
    .auth-quote { font-size: 14px; color: rgba(255,255,255,0.62); line-height: 1.65; margin-bottom: 12px; }
    .auth-author { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.3); letter-spacing: 0.02em; }
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
    .auth-field { margin-bottom: 20px; }
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
      margin-top: 4px;
    }
    .auth-btn:hover:not(:disabled) { background: #2D2D2A; transform: translateY(-1px); }
    .auth-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .auth-ftr { text-align: center; font-size: 14px; color: #6B6963; margin-top: 24px; }
    .auth-ftr a { color: #E10E1C; font-weight: 600; text-decoration: none; }
    .auth-ftr a:hover { text-decoration: underline; }
    .auth-forgot { text-align: right; margin-top: -12px; margin-bottom: 20px; font-size: 13px; }
    .auth-forgot a { color: #6B6963; text-decoration: none; }
    .auth-forgot a:hover { color: #E10E1C; }

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
              Your Google reviews,<br />replied to <em>automatically.</em>
            </div>
            <div className="auth-card">
              <div className="auth-stars">★★★★★</div>
              <div className="auth-quote">"Set it up on a Monday morning. By Tuesday we had replies going out to reviews we hadn't touched in weeks."</div>
              <div className="auth-author">— Rachel T., The Bloom Room, Bristol</div>
            </div>
          </div>
          <div className="auth-foot">© 2026 Revio · reviodigital.uk</div>
        </div>

        <div className="auth-form-wrap">
          <div className="auth-box">
            <h1 className="auth-h">Welcome back</h1>
            <p className="auth-sub">Sign in to your Revio account.</p>

            {error && <div className="auth-err">{error}</div>}

            <form onSubmit={handleLogin}>
              <div className="auth-field">
                <label htmlFor="email">Email address</label>
                <div className="auth-wrap">
                  <input
                    id="email"
                    className="auth-input"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@yourbusiness.co.uk"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>
              <div className="auth-field">
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px'}}>
                  <label htmlFor="password" style={{fontSize:'13px',fontWeight:600,color:'#3A3834'}}>Password</label>
                  <a href="/forgot-password" className="auth-forgot" style={{fontSize:'13px',color:'#6B6963',textDecoration:'none'}}>Forgot password?</a>
                </div>
                <div className="auth-wrap">
                  <input
                    id="password"
                    className="auth-input pw"
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Your password"
                    required
                    autoComplete="current-password"
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
                {loading ? 'Signing in…' : <>Sign in <ArrowRight size={15} /></>}
              </button>
            </form>

            <p className="auth-ftr">
              New to Revio? <a href="/register">Create an account →</a>
            </p>
          </div>
        </div>

      </div>
    </>
  )
}
