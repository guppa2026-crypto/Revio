'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, CreditCard, Settings, RefreshCw, LogOut, Menu, CheckCircle, ArrowRight } from 'lucide-react'
import api from '@/lib/api'
import axios from 'axios'

type BillingStatus = {
  is_subscribed: boolean
  stripe_subscription_id: string | null
  subscription_status: string | null
  current_period_end: number | null
}

const PLAN_FEATURES = [
  'One Google Business Profile location',
  'Unlimited reviews & AI-generated replies',
  'Risk-based auto-posting controls',
  'Email alerts for flagged reviews',
  'Rating goal tracker & calculator',
  'Approve, edit, or reject any reply',
]

export default function BillingPage() {
  const router = useRouter()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [message, setMessage] = useState('')
  const [messageSuccess, setMessageSuccess] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('subscription') === 'success') {
      setMessage('Subscription activated — welcome to Revio Pro.')
      setMessageSuccess(true)
    }
    if (params.get('subscription') === 'cancelled') {
      setMessage('Checkout cancelled — no changes made.')
      setMessageSuccess(false)
    }
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    try {
      const res = await api.get('/billing/status')
      setStatus(res.data)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        router.push('/login')
      } else {
        setMessage('Could not load billing info. Please refresh.')
        setMessageSuccess(false)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async () => {
    setSubscribing(true)
    try {
      const res = await api.post('/billing/create-checkout')
      window.location.href = res.data.checkout_url
    } catch {
      setMessage('Something went wrong. Please try again.')
      setMessageSuccess(false)
      setSubscribing(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) return
    setCancelling(true)
    try {
      await api.post('/billing/cancel')
      setMessage('Subscription cancelled.')
      setMessageSuccess(false)
      fetchStatus()
    } catch {
      setMessage('Failed to cancel. Please contact support.')
      setMessageSuccess(false)
    } finally {
      setCancelling(false)
    }
  }

  const handleGoogleConnect = async () => {
    try {
      const res = await api.get('/google/connect')
      window.location.href = res.data.auth_url
    } catch { alert('Failed to start Google connection.') }
  }

  const formatDate = (ts: number) =>
    new Date(ts * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; }
    .bl-layout { display: flex; min-height: 100vh; background: #F5F4F1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111110; }

    /* SIDEBAR */
    .bl-sidebar { width: 228px; background: #0F0F0E; display: flex; flex-direction: column; position: fixed; top: 0; left: 0; height: 100vh; z-index: 30; border-right: 1px solid rgba(255,255,255,0.06); transition: transform 0.2s ease; }
    .bl-backdrop { display: none; }
    .bl-nav-toggle { display: none; }
    .bl-sidebar-logo { padding: 22px 20px 20px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid rgba(255,255,255,0.06); margin-bottom: 8px; }
    .bl-logo-mark { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .bl-logo-mark img { width: 28px; height: 28px; object-fit: contain; }
    .bl-logo-name { font-size: 15px; font-weight: 700; color: #fff; letter-spacing: -0.01em; }
    .bl-nav { flex: 1; padding: 4px 10px; display: flex; flex-direction: column; gap: 2px; }
    .bl-nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; font-size: 13.5px; font-weight: 500; color: rgba(255,255,255,0.45); cursor: pointer; border: none; background: none; font-family: inherit; text-decoration: none; transition: background 0.15s, color 0.15s; width: 100%; text-align: left; }
    .bl-nav-item:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.8); }
    .bl-nav-item.active { background: rgba(255,255,255,0.1); color: #fff; font-weight: 600; }
    .bl-nav-item.active svg { color: rgba(255,255,255,0.9); }
    .bl-nav-item svg { flex-shrink: 0; }
    .bl-nav-section { font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.22); padding: 16px 12px 6px; }
    .bl-sidebar-bottom { padding: 10px; border-top: 1px solid rgba(255,255,255,0.06); }
    .bl-signout { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; font-size: 13.5px; font-weight: 500; color: rgba(255,255,255,0.35); cursor: pointer; border: none; background: none; font-family: inherit; width: 100%; transition: color 0.15s; }
    .bl-signout:hover { color: rgba(255,255,255,0.6); }

    /* MAIN */
    .bl-main { margin-left: 228px; flex: 1; display: flex; flex-direction: column; min-height: 100vh; }
    .bl-topbar { background: #F5F4F1; border-bottom: 1px solid #E5E3DC; padding: 0 28px; height: 58px; display: flex; align-items: center; gap: 12px; position: sticky; top: 0; z-index: 10; }
    .bl-topbar-title { font-size: 16px; font-weight: 700; color: #1A1916; letter-spacing: -0.01em; }
    .bl-content { padding: 28px; max-width: 640px; }

    .bl-msg { font-size: 14px; font-weight: 500; padding: 13px 16px; border-radius: 12px; margin-bottom: 20px; border: 1px solid; }
    .bl-msg-success { background: #DCFCE7; color: #166534; border-color: #BBF7D0; }
    .bl-msg-neutral { background: #F5F4F1; color: #6B6963; border-color: #E8E6E0; }

    /* CARDS */
    .bl-card { background: #fff; border: 1px solid #E8E6E0; border-radius: 16px; padding: 24px 26px; margin-bottom: 16px; }
    .bl-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #A8A49C; margin-bottom: 16px; }
    .bl-plan-row { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 16px; }
    .bl-plan-name { font-size: 18px; font-weight: 700; color: #1A1916; letter-spacing: -0.01em; }
    .bl-plan-price { font-size: 20px; font-weight: 700; color: #1A1916; letter-spacing: -0.02em; }
    .bl-plan-price span { font-size: 13px; font-weight: 400; color: #A8A49C; letter-spacing: 0; }
    .bl-features { display: flex; flex-direction: column; gap: 10px; padding-top: 16px; border-top: 1px solid #F0EFE8; }
    .bl-feature { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #4A4844; }
    .bl-feature-check { color: #16A34A; flex-shrink: 0; }

    .bl-status-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
    .bl-status-label { font-size: 14px; font-weight: 500; color: #4A4844; }
    .bl-status-badge { font-size: 12px; font-weight: 600; padding: 4px 11px; border-radius: 99px; }
    .bl-badge-active { background: #DCFCE7; color: #166534; }
    .bl-badge-inactive { background: #F1EFE8; color: #6B6963; }
    .bl-renewal { font-size: 13px; color: #A8A49C; margin-bottom: 20px; }
    .bl-divider { border: none; border-top: 1px solid #F0EFE8; margin: 18px 0; }

    .bl-btn { width: 100%; font-size: 14px; font-weight: 600; padding: 13px 20px; border-radius: 11px; cursor: pointer; border: 1.5px solid transparent; font-family: inherit; transition: all 0.15s; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .bl-btn-primary { background: #1A1916; color: #fff; border-color: #1A1916; }
    .bl-btn-primary:hover { background: #2D2D2A; }
    .bl-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .bl-btn-cancel { background: #fff; color: #B91C1C; border-color: #FECACA; }
    .bl-btn-cancel:hover { background: #FEF2F2; }
    .bl-btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }

    .bl-loading { text-align: center; padding: 4rem; color: #B8B4AC; font-size: 14px; }

    @media (max-width: 768px) {
      .bl-sidebar { transform: translateX(-100%); }
      .bl-sidebar.open { transform: translateX(0); }
      .bl-backdrop.open { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 25; }
      .bl-main { margin-left: 0; }
      .bl-topbar { padding: 0 16px; }
      .bl-content { padding: 16px; }
      .bl-nav-toggle { display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 8px; border: 1px solid #E0DED7; background: #fff; cursor: pointer; color: #1A1916; flex-shrink: 0; }
    }
  `

  return (
    <>
      <style>{css}</style>
      <div className="bl-layout">

        {/* SIDEBAR */}
        <div className={'bl-backdrop' + (mobileNavOpen ? ' open' : '')} onClick={() => setMobileNavOpen(false)} />
        <aside className={'bl-sidebar' + (mobileNavOpen ? ' open' : '')}>
          <div className="bl-sidebar-logo">
            <div className="bl-logo-mark">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/revio-icon.png" alt="" />
            </div>
            <span className="bl-logo-name">Revio</span>
          </div>
          <nav className="bl-nav">
            <span className="bl-nav-section">Manage</span>
            <button className="bl-nav-item" onClick={() => { setMobileNavOpen(false); router.push('/dashboard') }}>
              <LayoutDashboard size={15} />
              Dashboard
            </button>
            <button className="bl-nav-item active">
              <CreditCard size={15} />
              Billing
            </button>
            <button className="bl-nav-item" onClick={() => { setMobileNavOpen(false); router.push('/settings') }}>
              <Settings size={15} />
              Settings
            </button>
            <span className="bl-nav-section">Google</span>
            <button className="bl-nav-item" onClick={() => { setMobileNavOpen(false); handleGoogleConnect() }}>
              <RefreshCw size={15} />
              Connect Google
            </button>
          </nav>
          <div className="bl-sidebar-bottom">
            <button className="bl-signout" onClick={() => api.post('/auth/logout').finally(() => router.push('/login'))}>
              <LogOut size={15} />
              Sign out
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <div className="bl-main">
          <div className="bl-topbar">
            <button className="bl-nav-toggle" onClick={() => setMobileNavOpen(true)} aria-label="Open menu">
              <Menu size={18} />
            </button>
            <span className="bl-topbar-title">Billing</span>
          </div>

          <div className="bl-content">
            {loading && <div className="bl-loading">Loading billing info…</div>}

            {!loading && (
              <>
                {message && (
                  <div className={`bl-msg ${messageSuccess ? 'bl-msg-success' : 'bl-msg-neutral'}`}>
                    {message}
                  </div>
                )}

                <div className="bl-card">
                  <div className="bl-eyebrow">Your plan</div>
                  <div className="bl-plan-row">
                    <div className="bl-plan-name">Revio Pro</div>
                    <div className="bl-plan-price">£18<span>/mo inc VAT</span></div>
                  </div>
                  <div className="bl-features">
                    {PLAN_FEATURES.map(f => (
                      <div key={f} className="bl-feature">
                        <CheckCircle size={14} className="bl-feature-check" />
                        {f}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bl-card">
                  <div className="bl-eyebrow">Subscription status</div>
                  <div className="bl-status-row">
                    <span className="bl-status-label">Status</span>
                    <span className={`bl-status-badge ${status?.is_subscribed ? 'bl-badge-active' : 'bl-badge-inactive'}`}>
                      {status?.is_subscribed ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {status?.is_subscribed && status.current_period_end && (
                    <div className="bl-renewal">Renews {formatDate(status.current_period_end)}</div>
                  )}
                  <div className="bl-divider" />
                  {!status?.is_subscribed ? (
                    <button className="bl-btn bl-btn-primary" disabled={subscribing} onClick={handleSubscribe}>
                      {subscribing ? 'Redirecting to checkout…' : <>Subscribe for £18/month <ArrowRight size={15} /></>}
                    </button>
                  ) : (
                    <button className="bl-btn bl-btn-cancel" disabled={cancelling} onClick={handleCancel}>
                      {cancelling ? 'Cancelling…' : 'Cancel subscription'}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </>
  )
}
