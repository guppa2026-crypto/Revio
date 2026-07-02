'use client'
import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import api from '@/lib/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
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
    .input { width: 100%; font-size: 15px; color: #111110; background: #fff; border: 1.5px solid #E0DED7; border-radius: 12px; padding: 13px 16px; font-family: inherit; outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
    .input:focus { border-color: #111110; box-shadow: 0 0 0 3px rgba(17,17,16,0.06); }
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
  `

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

          {sent ? (
            <div className="success">
              <div className="success-icon">📬</div>
              <div className="success-h">Check your inbox</div>
              <p className="success-p">
                If <strong>{email}</strong> is registered, we&apos;ve sent a password reset link.
                It expires in 30 minutes. Check your spam folder if you don&apos;t see it.
              </p>
            </div>
          ) : (
            <>
              <h1 className="h">Forgot your password?</h1>
              <p className="sub">Enter your email address and we&apos;ll send you a link to reset it.</p>

              {error && <div className="err">{error}</div>}

              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label htmlFor="email">Email address</label>
                  <input
                    id="email"
                    className="input"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@yourbusiness.co.uk"
                    required
                    autoComplete="email"
                  />
                </div>
                <button className="btn" type="submit" disabled={loading}>
                  {loading ? 'Sending…' : <>Send reset link <ArrowRight size={15} /></>}
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
