'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import api from '@/lib/api'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/reset-password', { token, new_password: password })
      setDone(true)
      setTimeout(() => router.push('/login'), 3000)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Reset failed. The link may have expired.')
    } finally {
      setLoading(false)
    }
  }

  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; }
    .shell { min-height: 100vh; background: #FAFAF8; display: flex; align-items: center; justify-content: center; padding: 48px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111110; }
    .box { width: 100%; max-width: 400px; }
    .logo { display: flex; align-items: center; gap: 8px; font-size: 17px; font-weight: 800; letter-spacing: -0.02em; text-decoration: none; color: #111110; margin-bottom: 36px; }
    .logo img { height: 24px; width: auto; }
    .h { font-size: 26px; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 8px; }
    .sub { font-size: 15px; color: #6B6963; margin-bottom: 32px; line-height: 1.55; }
    .err { background: #FEF2F2; border: 1px solid #FECACA; color: #B91C1C; font-size: 13px; font-weight: 500; padding: 12px 14px; border-radius: 10px; margin-bottom: 20px; }
    .field { margin-bottom: 20px; }
    .field label { display: block; font-size: 13px; font-weight: 600; color: #3A3834; margin-bottom: 8px; }
    .wrap { position: relative; }
    .input { width: 100%; font-size: 15px; color: #111110; background: #fff; border: 1.5px solid #E0DED7; border-radius: 12px; padding: 13px 16px; font-family: inherit; outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
    .input:focus { border-color: #111110; box-shadow: 0 0 0 3px rgba(17,17,16,0.06); }
    .input.pw { padding-right: 52px; }
    .pw-btn { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #B8B4AC; padding: 4px; display: flex; align-items: center; transition: color 0.15s; }
    .pw-btn:hover { color: #6B6963; }
    .hint { font-size: 12px; color: #9E9B93; margin-top: 6px; }
    .btn { width: 100%; font-size: 15px; font-weight: 700; color: #fff; background: #111110; border: none; border-radius: 12px; padding: 14px 20px; cursor: pointer; font-family: inherit; display: flex; align-items: center; justify-content: center; gap: 8px; transition: background 0.15s, transform 0.1s; box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
    .btn:hover:not(:disabled) { background: #2D2D2A; transform: translateY(-1px); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .back { text-align: center; font-size: 14px; color: #6B6963; margin-top: 22px; }
    .back a { color: #E10E1C; font-weight: 600; text-decoration: none; }
    .back a:hover { text-decoration: underline; }
    .success { background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 14px; padding: 28px 24px; text-align: center; }
    .success-icon { font-size: 32px; margin-bottom: 14px; }
    .success-h { font-size: 20px; font-weight: 700; margin-bottom: 8px; }
    .success-p { font-size: 14px; color: #5F5E5A; line-height: 1.6; }
    .no-token { text-align: center; padding: 32px 0; }
    .no-token p { color: #6B6963; margin-bottom: 16px; }
  `

  if (!token) {
    return (
      <>
        <style>{css}</style>
        <div className="shell">
          <div className="box">
            <div className="no-token">
              <p>This reset link is invalid or missing a token.</p>
              <a href="/forgot-password" style={{color:'#E10E1C',fontWeight:600,textDecoration:'none'}}>Request a new reset link →</a>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <style>{css}</style>
      <div className="shell">
        <div className="box">
          <a className="logo" href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/revio-icon.png" alt="" />
            Revio
          </a>

          {done ? (
            <div className="success">
              <div className="success-icon">✅</div>
              <div className="success-h">Password reset!</div>
              <p className="success-p">Your password has been updated. Redirecting you to sign in…</p>
            </div>
          ) : (
            <>
              <h1 className="h">Set a new password</h1>
              <p className="sub">Choose a strong password for your Revio account.</p>

              {error && <div className="err">{error}</div>}

              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label htmlFor="password">New password</label>
                  <div className="wrap">
                    <input
                      id="password"
                      className="input pw"
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="8+ characters"
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="pw-btn"
                      onClick={() => setShowPw(s => !s)}
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="hint">Must include uppercase, lowercase, number, and special character.</p>
                </div>
                <div className="field">
                  <label htmlFor="confirm">Confirm new password</label>
                  <input
                    id="confirm"
                    className="input"
                    type={showPw ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repeat your password"
                    required
                    autoComplete="new-password"
                  />
                </div>
                <button className="btn" type="submit" disabled={loading}>
                  {loading ? 'Saving…' : <>Set new password <ArrowRight size={15} /></>}
                </button>
              </form>
            </>
          )}

          <p className="back">
            <a href="/login">← Back to sign in</a>
          </p>
        </div>
      </div>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}
