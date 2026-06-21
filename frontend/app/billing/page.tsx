'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import axios from 'axios'

type BillingStatus = {
  is_subscribed: boolean
  stripe_subscription_id: string | null
  subscription_status: string | null
  current_period_end: number | null
}

export default function BillingPage() {
  const router = useRouter()
  const [status, setStatus] = useState<BillingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('subscription') === 'success') setMessage('🎉 Subscription activated!')
    if (params.get('subscription') === 'cancelled') setMessage('Checkout cancelled.')
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
        setMessage('Could not load your billing info. Refresh the page or try again shortly.')
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
      setSubscribing(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) return
    setCancelling(true)
    try {
      await api.post('/billing/cancel')
      setMessage('Subscription cancelled.')
      fetchStatus()
    } catch {
      setMessage('Failed to cancel. Please contact support.')
    } finally {
      setCancelling(false)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric'
    })
  }

  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    .shell { min-height: 100vh; background: #F7F6F3; font-family: system-ui, sans-serif; }
    .nav { background: #fff; border-bottom: 1px solid #ECEAE4; padding: 0 2rem; height: 56px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 10; }
    .nav-logo { font-size: 17px; font-weight: 600; color: #1A1916; display: flex; align-items: center; gap: 8px; cursor: pointer; }
    .nav-dot { width: 8px; height: 8px; border-radius: 50%; background: #E10E1C; }
    .nav-signout { font-size: 13px; color: #888; border: none; background: none; cursor: pointer; padding: 6px 10px; border-radius: 6px; }
    .page { max-width: 560px; margin: 0 auto; padding: 3rem 1.5rem; }
    .page-title { font-size: 22px; font-weight: 600; color: #1A1916; margin-bottom: 2rem; }
    .card { background: #fff; border: 1px solid #ECEAE4; border-radius: 14px; padding: 24px; margin-bottom: 16px; }
    .card-title { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #9E9B93; margin-bottom: 16px; }
    .plan-row { display: flex; align-items: center; justify-content: space-between; }
    .plan-name { font-size: 20px; font-weight: 600; color: #1A1916; }
    .plan-price { font-size: 20px; font-weight: 600; color: #1A1916; }
    .plan-price span { font-size: 13px; font-weight: 400; color: #9E9B93; }
    .plan-features { margin-top: 16px; display: flex; flex-direction: column; gap: 8px; }
    .feature { font-size: 13px; color: #4A4844; display: flex; align-items: center; gap: 8px; }
    .feature::before { content: '✓'; color: #3B6D11; font-weight: 600; }
    .status-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .status-label { font-size: 14px; color: #4A4844; }
    .status-badge { font-size: 12px; font-weight: 500; padding: 3px 10px; border-radius: 99px; }
    .status-active { background: #EAF3DE; color: #3B6D11; }
    .status-inactive { background: #F1EFE8; color: #5F5E5A; }
    .renewal { font-size: 13px; color: #9E9B93; margin-top: 4px; }
    .btn { width: 100%; font-size: 14px; font-weight: 500; padding: 12px; border-radius: 10px; cursor: pointer; border: 1px solid transparent; font-family: inherit; transition: all 0.15s; margin-top: 8px; }
    .btn-subscribe { background: #1A1916; color: #fff; }
    .btn-subscribe:hover { background: #333; }
    .btn-subscribe:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-cancel { background: #fff; color: #A32D2D; border-color: #F7C1C1; }
    .btn-cancel:hover { background: #FCEBEB; }
    .btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }
    .message { font-size: 13px; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; background: #EAF3DE; color: #3B6D11; border: 1px solid #C0DD97; }
    .message-neutral { background: #F1EFE8; color: #5F5E5A; border-color: #E0DDD5; }
    .loading { text-align: center; padding: 4rem; color: #B0ADA5; font-size: 14px; }
    .back-link { font-size: 13px; color: #E10E1C; cursor: pointer; margin-bottom: 1.5rem; display: inline-block; }
    .back-link:hover { text-decoration: underline; }
    .divider { height: 1px; background: #ECEAE4; margin: 16px 0; }
  `

  return (
    <>
      <style>{css}</style>
      <div className="shell">
        <nav className="nav">
          <div className="nav-logo" onClick={() => router.push('/dashboard')}>
            <div className="nav-dot" />
            Revio
          </div>
          <button className="nav-signout" onClick={() => { localStorage.removeItem('token'); router.push('/login') }}>
            Sign out
          </button>
        </nav>

        <div className="page">
          <span className="back-link" onClick={() => router.push('/dashboard')}>← Back to dashboard</span>
          <h1 className="page-title">Billing</h1>

          {loading && <div className="loading">Loading billing info…</div>}

          {!loading && (
            <>
              {message && (
                <div className={`message ${message.includes('cancelled') ? 'message-neutral' : ''}`}>
                  {message}
                </div>
              )}

              <div className="card">
                <div className="card-title">Your plan</div>
                <div className="plan-row">
                  <div className="plan-name">Revio Pro</div>
                  <div className="plan-price">£18<span>/mo inc VAT</span></div>
                </div>
                <div className="plan-features">
                  <div className="feature">AI-powered review analysis</div>
                  <div className="feature">Automated reply generation</div>
                  <div className="feature">Email alerts for flagged reviews</div>
                  <div className="feature">Approve, edit or reject replies</div>
                  <div className="feature">Google Reviews integration</div>
                </div>
              </div>

              <div className="card">
                <div className="card-title">Subscription status</div>
                <div className="status-row">
                  <span className="status-label">Status</span>
                  <span className={`status-badge ${status?.is_subscribed ? 'status-active' : 'status-inactive'}`}>
                    {status?.is_subscribed ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {status?.is_subscribed && status.current_period_end && (
                  <div className="renewal">Renews {formatDate(status.current_period_end)}</div>
                )}

                <div className="divider" />

                {!status?.is_subscribed ? (
                  <button
                    className="btn btn-subscribe"
                    disabled={subscribing}
                    onClick={handleSubscribe}
                  >
                    {subscribing ? 'Redirecting to checkout…' : 'Subscribe for £18/month'}
                  </button>
                ) : (
                  <button
                    className="btn btn-cancel"
                    disabled={cancelling}
                    onClick={handleCancel}
                  >
                    {cancelling ? 'Cancelling…' : 'Cancel subscription'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}