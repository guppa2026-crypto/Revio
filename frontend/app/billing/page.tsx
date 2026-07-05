'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, CreditCard, Settings, LogOut, Menu, CheckCircle, ArrowRight, BarChart2, Zap } from 'lucide-react'
import api from '@/lib/api'
import axios from 'axios'

type BillingStatus = {
  is_subscribed: boolean
  subscription_status: string | null
  current_period_end: number | null
  is_trial: boolean
  trial_days_remaining: number
  plan: 'starter' | 'pro' | null
  ai_replies_used: number
  ai_replies_limit: number | null
}

const SHARED_FEATURES = [
  'One Google Business Profile location',
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
  const [subscribing, setSubscribing] = useState<'starter' | 'pro' | null>(null)
  const [upgrading, setUpgrading] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [message, setMessage] = useState('')
  const [messageSuccess, setMessageSuccess] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('subscription') === 'success') {
      setMessage('Subscription activated — you\'re all set.')
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

  const handleSubscribe = async (plan: 'starter' | 'pro') => {
    setSubscribing(plan)
    try {
      const res = await api.post('/billing/create-checkout', { plan })
      window.location.href = res.data.checkout_url
    } catch {
      setMessage('Something went wrong. Please try again.')
      setMessageSuccess(false)
      setSubscribing(null)
    }
  }

  const handleUpgrade = async () => {
    if (!confirm('Upgrade to Pro? You\'ll be charged the prorated difference immediately.')) return
    setUpgrading(true)
    try {
      await api.post('/billing/upgrade')
      setMessage('Upgraded to Pro — unlimited AI replies unlocked.')
      setMessageSuccess(true)
      fetchStatus()
    } catch {
      setMessage('Upgrade failed. Please try again or contact support.')
      setMessageSuccess(false)
    } finally {
      setUpgrading(false)
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

  const formatDate = (ts: number) =>
    new Date(ts * 1000).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })

  const usagePct = (status?.ai_replies_limit && status.ai_replies_limit > 0)
    ? Math.min(100, Math.round((status.ai_replies_used / status.ai_replies_limit) * 100))
    : 0
  const atLimit = status?.ai_replies_limit !== null && status?.ai_replies_limit !== undefined
    && status.ai_replies_used >= (status.ai_replies_limit ?? Infinity)

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
    .bl-nav-item svg { flex-shrink: 0; }
    .bl-nav-section { font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.22); padding: 16px 12px 6px; }
    .bl-sidebar-bottom { padding: 10px; border-top: 1px solid rgba(255,255,255,0.06); }
    .bl-signout { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; font-size: 13.5px; font-weight: 500; color: rgba(255,255,255,0.35); cursor: pointer; border: none; background: none; font-family: inherit; width: 100%; transition: color 0.15s; }
    .bl-signout:hover { color: rgba(255,255,255,0.6); }

    /* MAIN */
    .bl-main { margin-left: 228px; flex: 1; display: flex; flex-direction: column; min-height: 100vh; }
    .bl-topbar { background: #F5F4F1; border-bottom: 1px solid #E5E3DC; padding: 0 28px; height: 58px; display: flex; align-items: center; gap: 12px; position: sticky; top: 0; z-index: 10; }
    .bl-topbar-title { font-size: 16px; font-weight: 700; color: #1A1916; letter-spacing: -0.01em; }
    .bl-content { padding: 28px; max-width: 700px; }

    .bl-msg { font-size: 14px; font-weight: 500; padding: 13px 16px; border-radius: 12px; margin-bottom: 20px; border: 1px solid; }
    .bl-msg-success { background: #DCFCE7; color: #166534; border-color: #BBF7D0; }
    .bl-msg-neutral { background: #F5F4F1; color: #6B6963; border-color: #E8E6E0; }
    .bl-msg-warn { background: #FEF9C3; color: #854D0E; border-color: #FDE68A; }

    /* TRIAL BANNER */
    .bl-trial-banner { background: #fff; border: 1px solid #E8E6E0; border-radius: 14px; padding: 18px 20px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .bl-trial-banner-left { display: flex; flex-direction: column; gap: 3px; }
    .bl-trial-label { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #A8A49C; }
    .bl-trial-text { font-size: 14px; font-weight: 600; color: #1A1916; }
    .bl-trial-sub { font-size: 13px; color: #6B6963; }

    /* PLAN CARDS */
    .bl-plan-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 0; }
    .bl-plan-card { background: #fff; border: 1.5px solid #E8E6E0; border-radius: 16px; padding: 24px; display: flex; flex-direction: column; }
    .bl-plan-card.featured { background: #111110; border-color: #111110; color: #fff; }
    .bl-plan-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #E10E1C; background: #FDECEC; border: 1px solid #F8C9CC; padding: 3px 9px; border-radius: 99px; margin-bottom: 14px; width: fit-content; }
    .bl-plan-name { font-size: 17px; font-weight: 700; color: #1A1916; letter-spacing: -0.01em; margin-bottom: 4px; }
    .bl-plan-card.featured .bl-plan-name { color: #fff; }
    .bl-plan-price { font-size: 32px; font-weight: 800; color: #1A1916; letter-spacing: -0.03em; line-height: 1; margin-bottom: 2px; }
    .bl-plan-card.featured .bl-plan-price { color: #fff; }
    .bl-plan-price span { font-size: 14px; font-weight: 400; color: #A8A49C; letter-spacing: 0; }
    .bl-plan-vat { font-size: 11px; color: #A8A49C; margin-bottom: 18px; }
    .bl-plan-card.featured .bl-plan-vat { color: rgba(255,255,255,0.35); }
    .bl-plan-reply-limit { font-size: 13px; font-weight: 600; color: #E10E1C; background: #FDECEC; border: 1px solid #F8C9CC; padding: 5px 11px; border-radius: 8px; margin-bottom: 18px; width: fit-content; }
    .bl-plan-card.featured .bl-plan-reply-limit { color: rgba(255,255,255,0.9); background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.15); }
    .bl-plan-features { display: flex; flex-direction: column; gap: 9px; flex: 1; margin-bottom: 22px; }
    .bl-plan-feature { display: flex; align-items: center; gap: 9px; font-size: 13px; color: #4A4844; }
    .bl-plan-card.featured .bl-plan-feature { color: rgba(255,255,255,0.7); }
    .bl-plan-feature-check { color: #16A34A; flex-shrink: 0; }
    .bl-plan-card.featured .bl-plan-feature-check { color: rgba(255,255,255,0.5); }
    .bl-plan-btn { width: 100%; font-size: 14px; font-weight: 600; padding: 12px 18px; border-radius: 10px; cursor: pointer; border: 1.5px solid transparent; font-family: inherit; transition: all 0.15s; display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: auto; }
    .bl-plan-btn-dark { background: #1A1916; color: #fff; border-color: #1A1916; }
    .bl-plan-btn-dark:hover { background: #2D2D2A; }
    .bl-plan-btn-outline { background: transparent; color: #1A1916; border-color: #E8E6E0; }
    .bl-plan-btn-outline:hover { background: #F5F4F1; }
    .bl-plan-btn-white { background: #fff; color: #111110; border-color: #fff; }
    .bl-plan-btn-white:hover { opacity: 0.9; }
    .bl-plan-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    /* ACTIVE SUBSCRIPTION CARD */
    .bl-card { background: #fff; border: 1px solid #E8E6E0; border-radius: 16px; padding: 24px 26px; margin-bottom: 16px; }
    .bl-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #A8A49C; margin-bottom: 16px; }
    .bl-active-plan-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
    .bl-active-plan-name { font-size: 18px; font-weight: 700; color: #1A1916; letter-spacing: -0.01em; }
    .bl-active-plan-price { font-size: 18px; font-weight: 700; color: #1A1916; }
    .bl-active-plan-price span { font-size: 13px; font-weight: 400; color: #A8A49C; }
    .bl-status-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
    .bl-status-label { font-size: 14px; font-weight: 500; color: #4A4844; }
    .bl-status-badge { font-size: 12px; font-weight: 600; padding: 4px 11px; border-radius: 99px; }
    .bl-badge-active { background: #DCFCE7; color: #166534; }
    .bl-badge-inactive { background: #F1EFE8; color: #6B6963; }
    .bl-renewal { font-size: 13px; color: #A8A49C; margin-bottom: 20px; }
    .bl-divider { border: none; border-top: 1px solid #F0EFE8; margin: 18px 0; }

    /* USAGE BAR */
    .bl-usage { margin: 16px 0; }
    .bl-usage-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
    .bl-usage-label { font-size: 13px; font-weight: 500; color: #4A4844; }
    .bl-usage-count { font-size: 13px; font-weight: 600; color: #1A1916; }
    .bl-usage-track { background: #F0EFE8; border-radius: 99px; height: 6px; overflow: hidden; }
    .bl-usage-fill { height: 100%; border-radius: 99px; transition: width 0.4s ease; }
    .bl-usage-fill-ok { background: #16A34A; }
    .bl-usage-fill-warn { background: #D97706; }
    .bl-usage-fill-full { background: #E10E1C; }

    /* UPGRADE BANNER */
    .bl-upgrade-band { background: #111110; border-radius: 14px; padding: 20px 22px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .bl-upgrade-band-left { display: flex; flex-direction: column; gap: 4px; }
    .bl-upgrade-band-title { font-size: 14px; font-weight: 700; color: #fff; }
    .bl-upgrade-band-sub { font-size: 13px; color: rgba(255,255,255,0.5); }
    .bl-upgrade-btn { font-size: 13px; font-weight: 700; color: #111110; background: #fff; padding: 9px 18px; border-radius: 9px; border: none; cursor: pointer; font-family: inherit; white-space: nowrap; display: flex; align-items: center; gap: 6px; transition: opacity 0.15s; flex-shrink: 0; }
    .bl-upgrade-btn:hover { opacity: 0.88; }
    .bl-upgrade-btn:disabled { opacity: 0.4; cursor: not-allowed; }

    .bl-btn { width: 100%; font-size: 14px; font-weight: 600; padding: 13px 20px; border-radius: 11px; cursor: pointer; border: 1.5px solid transparent; font-family: inherit; transition: all 0.15s; display: flex; align-items: center; justify-content: center; gap: 8px; }
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
      .bl-plan-grid { grid-template-columns: 1fr; }
      .bl-upgrade-band { flex-direction: column; align-items: flex-start; }
    }
  `

  const usageFillClass = usagePct >= 100
    ? 'bl-usage-fill-full'
    : usagePct >= 80
      ? 'bl-usage-fill-warn'
      : 'bl-usage-fill-ok'

  const planLabel = status?.plan === 'starter' ? 'Revio Starter' : 'Revio Pro'
  const planPrice = status?.plan === 'starter' ? '£7.99' : '£14.99'

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
            <button className="bl-nav-item" onClick={() => { setMobileNavOpen(false); router.push('/analytics') }}>
              <BarChart2 size={15} />
              Analytics
            </button>
            <button className="bl-nav-item active">
              <CreditCard size={15} />
              Billing
            </button>
            <button className="bl-nav-item" onClick={() => { setMobileNavOpen(false); router.push('/settings') }}>
              <Settings size={15} />
              Settings
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

                {/* ── NOT SUBSCRIBED: show plan picker ── */}
                {!status?.is_subscribed && (
                  <>
                    {/* Trial status banner */}
                    {status?.is_trial && (
                      <div className="bl-trial-banner">
                        <div className="bl-trial-banner-left">
                          <span className="bl-trial-label">Free trial</span>
                          <span className="bl-trial-text">
                            {status.trial_days_remaining} day{status.trial_days_remaining !== 1 ? 's' : ''} remaining
                          </span>
                          <span className="bl-trial-sub">
                            {status.ai_replies_used} of 5 AI replies used
                            {atLimit ? ' — limit reached' : ''}
                          </span>
                        </div>
                        {atLimit && (
                          <span style={{fontSize: 12, color: '#B91C1C', fontWeight: 600, background: '#FEF2F2', border: '1px solid #FECACA', padding: '4px 10px', borderRadius: 8}}>
                            Upgrade to continue
                          </span>
                        )}
                      </div>
                    )}
                    {!status?.is_trial && (
                      <div className="bl-msg bl-msg-neutral">
                        Your free trial has ended. Subscribe below to keep using Revio.
                      </div>
                    )}

                    <div className="bl-plan-grid">
                      {/* STARTER */}
                      <div className="bl-plan-card">
                        <div className="bl-plan-name">Starter</div>
                        <div className="bl-plan-price">£7.99<span>/mo</span></div>
                        <div className="bl-plan-vat">inc. VAT</div>
                        <div className="bl-plan-reply-limit">30 AI replies / month</div>
                        <div className="bl-plan-features">
                          {SHARED_FEATURES.map(f => (
                            <div key={f} className="bl-plan-feature">
                              <CheckCircle size={13} className="bl-plan-feature-check" />
                              {f}
                            </div>
                          ))}
                        </div>
                        <button
                          className="bl-plan-btn bl-plan-btn-outline"
                          disabled={subscribing !== null}
                          onClick={() => handleSubscribe('starter')}
                        >
                          {subscribing === 'starter' ? 'Redirecting…' : 'Choose Starter'}
                        </button>
                      </div>

                      {/* PRO */}
                      <div className="bl-plan-card featured">
                        <div className="bl-plan-badge">
                          <Zap size={10} />
                          Most popular
                        </div>
                        <div className="bl-plan-name">Pro</div>
                        <div className="bl-plan-price">£14.99<span>/mo</span></div>
                        <div className="bl-plan-vat">inc. VAT</div>
                        <div className="bl-plan-reply-limit">Unlimited AI replies</div>
                        <div className="bl-plan-features">
                          {SHARED_FEATURES.map(f => (
                            <div key={f} className="bl-plan-feature">
                              <CheckCircle size={13} className="bl-plan-feature-check" />
                              {f}
                            </div>
                          ))}
                        </div>
                        <button
                          className="bl-plan-btn bl-plan-btn-white"
                          disabled={subscribing !== null}
                          onClick={() => handleSubscribe('pro')}
                        >
                          {subscribing === 'pro' ? 'Redirecting…' : <>Choose Pro <ArrowRight size={14} /></>}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* ── SUBSCRIBED ── */}
                {status?.is_subscribed && (
                  <>
                    {/* Upgrade prompt for Starter users */}
                    {status.plan === 'starter' && (
                      <div className="bl-upgrade-band">
                        <div className="bl-upgrade-band-left">
                          <div className="bl-upgrade-band-title">Upgrade to Pro — £14.99/mo</div>
                          <div className="bl-upgrade-band-sub">Unlimited AI replies, same great features.</div>
                        </div>
                        <button className="bl-upgrade-btn" disabled={upgrading} onClick={handleUpgrade}>
                          {upgrading ? 'Upgrading…' : <><Zap size={13} /> Upgrade now</>}
                        </button>
                      </div>
                    )}

                    {/* Current plan */}
                    <div className="bl-card">
                      <div className="bl-eyebrow">Your plan</div>
                      <div className="bl-active-plan-row">
                        <div className="bl-active-plan-name">{planLabel}</div>
                        <div className="bl-active-plan-price">
                          {planPrice}<span>/mo inc VAT</span>
                        </div>
                      </div>

                      {/* Usage bar for Starter */}
                      {status.plan === 'starter' && status.ai_replies_limit !== null && (
                        <div className="bl-usage">
                          <div className="bl-usage-header">
                            <span className="bl-usage-label">AI replies this month</span>
                            <span className="bl-usage-count">{status.ai_replies_used} / {status.ai_replies_limit}</span>
                          </div>
                          <div className="bl-usage-track">
                            <div
                              className={`bl-usage-fill ${usageFillClass}`}
                              style={{width: `${usagePct}%`}}
                            />
                          </div>
                          {atLimit && (
                            <div style={{fontSize: 12, color: '#B91C1C', marginTop: 8, fontWeight: 500}}>
                              Monthly limit reached — upgrade to Pro for unlimited replies.
                            </div>
                          )}
                        </div>
                      )}

                      {/* Pro — unlimited indicator */}
                      {status.plan !== 'starter' && (
                        <div style={{fontSize: 13, color: '#6B6963', marginTop: 8}}>Unlimited AI replies included</div>
                      )}
                    </div>

                    {/* Subscription status */}
                    <div className="bl-card">
                      <div className="bl-eyebrow">Subscription</div>
                      <div className="bl-status-row">
                        <span className="bl-status-label">Status</span>
                        <span className={`bl-status-badge ${status?.is_subscribed ? 'bl-badge-active' : 'bl-badge-inactive'}`}>
                          {status?.subscription_status === 'comp' ? 'Complimentary' : status?.is_subscribed ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {status?.current_period_end && (
                        <div className="bl-renewal">Renews {formatDate(status.current_period_end)}</div>
                      )}
                      {status?.subscription_status !== 'comp' && (
                        <>
                          <div className="bl-divider" />
                          <button className="bl-btn bl-btn-cancel" disabled={cancelling} onClick={handleCancel}>
                            {cancelling ? 'Cancelling…' : 'Cancel subscription'}
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

      </div>
    </>
  )
}
