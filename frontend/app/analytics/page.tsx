'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, CreditCard, Settings, LogOut, Menu, BarChart2 } from 'lucide-react'
import api from '@/lib/api'
import axios from 'axios'

type MonthData = {
  month: string
  label: string
  count: number
  avg_rating: number | null
  responded: number
}

type Overall = {
  total_reviews: number
  avg_rating: number
  response_rate: number
  avg_reply_hours: number | null
}

type Analytics = {
  monthly: MonthData[]
  overall: Overall
}

export default function AnalyticsPage() {
  const router = useRouter()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/analytics/')
      .then(res => setData(res.data))
      .catch(err => {
        if (axios.isAxiosError(err) && err.response?.status === 401) {
          router.push('/login')
        } else if (axios.isAxiosError(err) && err.response?.status === 403) {
          setError('Analytics requires an active subscription.')
        } else {
          setError('Could not load analytics. Please refresh.')
        }
      })
      .finally(() => setLoading(false))
  }, [router])

  const pct = (v: number) => `${Math.round(v * 100)}%`

  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; }
    .an-layout { display: flex; min-height: 100vh; background: #F5F4F1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111110; }

    /* SIDEBAR */
    .an-sidebar { width: 228px; background: #0F0F0E; display: flex; flex-direction: column; position: fixed; top: 0; left: 0; height: 100vh; z-index: 30; border-right: 1px solid rgba(255,255,255,0.06); transition: transform 0.2s ease; }
    .an-backdrop { display: none; }
    .an-nav-toggle { display: none; }
    .an-sidebar-logo { padding: 22px 20px 20px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid rgba(255,255,255,0.06); margin-bottom: 8px; }
    .an-logo-mark { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .an-logo-mark img { width: 28px; height: 28px; object-fit: contain; }
    .an-logo-name { font-size: 15px; font-weight: 700; color: #fff; letter-spacing: -0.01em; }
    .an-nav { flex: 1; padding: 4px 10px; display: flex; flex-direction: column; gap: 2px; }
    .an-nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; font-size: 13.5px; font-weight: 500; color: rgba(255,255,255,0.45); cursor: pointer; border: none; background: none; font-family: inherit; text-decoration: none; transition: background 0.15s, color 0.15s; width: 100%; text-align: left; }
    .an-nav-item:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.8); }
    .an-nav-item.active { background: rgba(255,255,255,0.1); color: #fff; font-weight: 600; }
    .an-nav-item svg { flex-shrink: 0; }
    .an-nav-section { font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.22); padding: 16px 12px 6px; }
    .an-sidebar-bottom { padding: 10px; border-top: 1px solid rgba(255,255,255,0.06); }
    .an-signout { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; font-size: 13.5px; font-weight: 500; color: rgba(255,255,255,0.35); cursor: pointer; border: none; background: none; font-family: inherit; width: 100%; transition: color 0.15s; }
    .an-signout:hover { color: rgba(255,255,255,0.6); }

    /* MAIN */
    .an-main { margin-left: 228px; flex: 1; display: flex; flex-direction: column; min-height: 100vh; }
    .an-topbar { background: #F5F4F1; border-bottom: 1px solid #E5E3DC; padding: 0 28px; height: 58px; display: flex; align-items: center; gap: 12px; position: sticky; top: 0; z-index: 10; }
    .an-topbar-title { font-size: 16px; font-weight: 700; color: #1A1916; letter-spacing: -0.01em; }
    .an-content { padding: 28px; max-width: 900px; }

    /* STAT CARDS */
    .an-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 28px; }
    .an-stat { background: #fff; border: 1px solid #E8E6E0; border-radius: 14px; padding: 18px 20px; }
    .an-stat-label { font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #A8A49C; margin-bottom: 8px; }
    .an-stat-value { font-size: 26px; font-weight: 700; color: #1A1916; letter-spacing: -0.02em; }
    .an-stat-sub { font-size: 12px; color: #A8A49C; margin-top: 4px; }

    /* CHARTS */
    .an-card { background: #fff; border: 1px solid #E8E6E0; border-radius: 16px; padding: 22px 24px; margin-bottom: 20px; }
    .an-card-title { font-size: 13px; font-weight: 700; color: #1A1916; letter-spacing: -0.01em; margin-bottom: 20px; }

    /* BAR CHART */
    .an-barchart { display: flex; align-items: flex-end; gap: 10px; height: 140px; }
    .an-bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0; height: 100%; justify-content: flex-end; }
    .an-bar-val { font-size: 11px; font-weight: 600; color: #4A4844; margin-bottom: 4px; }
    .an-bar { width: 100%; border-radius: 5px 5px 0 0; min-height: 3px; transition: height 0.3s; }
    .an-bar-rating { background: #D4A843; }
    .an-bar-count { background: #1A1916; }
    .an-bar-label { font-size: 11px; color: #A8A49C; margin-top: 8px; }
    .an-bar-axis { border-top: 1px solid #E8E6E0; margin-top: 0; }

    /* RESPONSE RATE BARS */
    .an-resp-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .an-resp-label { font-size: 12px; color: #6B6963; width: 36px; flex-shrink: 0; }
    .an-resp-track { flex: 1; height: 8px; background: #F0EFE8; border-radius: 4px; overflow: hidden; }
    .an-resp-fill { height: 100%; border-radius: 4px; background: #16A34A; transition: width 0.4s; }
    .an-resp-pct { font-size: 12px; font-weight: 600; color: #4A4844; width: 36px; text-align: right; flex-shrink: 0; }

    .an-empty { text-align: center; padding: 48px; color: #A8A49C; font-size: 14px; }
    .an-loading { text-align: center; padding: 4rem; color: #B8B4AC; font-size: 14px; }
    .an-error { background: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; padding: 14px 18px; font-size: 14px; color: #B91C1C; margin-bottom: 20px; }

    @media (max-width: 900px) {
      .an-stats { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 768px) {
      .an-sidebar { transform: translateX(-100%); }
      .an-sidebar.open { transform: translateX(0); }
      .an-backdrop.open { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 25; }
      .an-main { margin-left: 0; }
      .an-topbar { padding: 0 16px; }
      .an-content { padding: 16px; }
      .an-nav-toggle { display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 8px; border: 1px solid #E0DED7; background: #fff; cursor: pointer; color: #1A1916; flex-shrink: 0; }
      .an-stats { grid-template-columns: repeat(2, 1fr); }
      .an-barchart { gap: 6px; }
    }
    @media (max-width: 480px) {
      .an-stats { grid-template-columns: 1fr 1fr; }
    }
  `

  const maxCount = data ? Math.max(...data.monthly.map(m => m.count), 1) : 1

  return (
    <>
      <style>{css}</style>
      <div className="an-layout">

        <div className={'an-backdrop' + (mobileNavOpen ? ' open' : '')} onClick={() => setMobileNavOpen(false)} />
        <aside className={'an-sidebar' + (mobileNavOpen ? ' open' : '')}>
          <div className="an-sidebar-logo">
            <div className="an-logo-mark">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/revio-icon.png" alt="" />
            </div>
            <span className="an-logo-name">Revio</span>
          </div>
          <nav className="an-nav">
            <span className="an-nav-section">Manage</span>
            <button className="an-nav-item" onClick={() => { setMobileNavOpen(false); router.push('/dashboard') }}>
              <LayoutDashboard size={15} />
              Dashboard
            </button>
            <button className="an-nav-item active">
              <BarChart2 size={15} />
              Analytics
            </button>
            <button className="an-nav-item" onClick={() => { setMobileNavOpen(false); router.push('/billing') }}>
              <CreditCard size={15} />
              Billing
            </button>
            <button className="an-nav-item" onClick={() => { setMobileNavOpen(false); router.push('/settings') }}>
              <Settings size={15} />
              Settings
            </button>
          </nav>
          <div className="an-sidebar-bottom">
            <button className="an-signout" onClick={() => api.post('/auth/logout').finally(() => router.push('/login'))}>
              <LogOut size={15} />
              Sign out
            </button>
          </div>
        </aside>

        <div className="an-main">
          <div className="an-topbar">
            <button className="an-nav-toggle" onClick={() => setMobileNavOpen(true)} aria-label="Open menu">
              <Menu size={18} />
            </button>
            <span className="an-topbar-title">Analytics</span>
          </div>

          <div className="an-content">
            {loading && <div className="an-loading">Loading analytics…</div>}
            {error && <div className="an-error">{error}</div>}

            {!loading && !error && data && (
              <>
                {/* Stat cards */}
                <div className="an-stats">
                  <div className="an-stat">
                    <div className="an-stat-label">Total reviews</div>
                    <div className="an-stat-value">{data.overall.total_reviews}</div>
                  </div>
                  <div className="an-stat">
                    <div className="an-stat-label">Avg rating</div>
                    <div className="an-stat-value" style={{ color: '#D4A843' }}>
                      {data.overall.avg_rating > 0 ? data.overall.avg_rating.toFixed(1) : '—'}
                    </div>
                    <div className="an-stat-sub">out of 5</div>
                  </div>
                  <div className="an-stat">
                    <div className="an-stat-label">Response rate</div>
                    <div className="an-stat-value" style={{ color: data.overall.response_rate >= 0.8 ? '#16A34A' : '#D97706' }}>
                      {data.overall.total_reviews > 0 ? pct(data.overall.response_rate) : '—'}
                    </div>
                    <div className="an-stat-sub">replies sent or approved</div>
                  </div>
                  <div className="an-stat">
                    <div className="an-stat-label">Avg reply time</div>
                    <div className="an-stat-value">
                      {data.overall.avg_reply_hours != null
                        ? data.overall.avg_reply_hours < 24
                          ? `${data.overall.avg_reply_hours.toFixed(1)}h`
                          : `${(data.overall.avg_reply_hours / 24).toFixed(1)}d`
                        : '—'}
                    </div>
                    <div className="an-stat-sub">from import to posted</div>
                  </div>
                </div>

                {data.overall.total_reviews === 0 ? (
                  <div className="an-card">
                    <div className="an-empty">No review data yet. Import or connect Google to see analytics here.</div>
                  </div>
                ) : (
                  <>
                    {/* Rating by month */}
                    <div className="an-card">
                      <div className="an-card-title">Average rating — last 6 months</div>
                      <div className="an-barchart">
                        {data.monthly.map(m => (
                          <div key={m.month} className="an-bar-col">
                            {m.avg_rating != null && (
                              <div className="an-bar-val">{m.avg_rating.toFixed(1)}</div>
                            )}
                            <div
                              className="an-bar an-bar-rating"
                              style={{ height: m.avg_rating != null ? `${(m.avg_rating / 5) * 100}%` : '0%' }}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="an-bar-axis" />
                      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                        {data.monthly.map(m => (
                          <div key={m.month} className="an-bar-label" style={{ flex: 1, textAlign: 'center' }}>{m.label}</div>
                        ))}
                      </div>
                    </div>

                    {/* Reviews per month */}
                    <div className="an-card">
                      <div className="an-card-title">Reviews received — last 6 months</div>
                      <div className="an-barchart">
                        {data.monthly.map(m => (
                          <div key={m.month} className="an-bar-col">
                            {m.count > 0 && <div className="an-bar-val">{m.count}</div>}
                            <div
                              className="an-bar an-bar-count"
                              style={{ height: `${(m.count / maxCount) * 100}%` }}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="an-bar-axis" />
                      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                        {data.monthly.map(m => (
                          <div key={m.month} className="an-bar-label" style={{ flex: 1, textAlign: 'center' }}>{m.label}</div>
                        ))}
                      </div>
                    </div>

                    {/* Response rate by month */}
                    <div className="an-card">
                      <div className="an-card-title">Response rate — last 6 months</div>
                      {data.monthly.map(m => (
                        <div key={m.month} className="an-resp-row">
                          <span className="an-resp-label">{m.label}</span>
                          <div className="an-resp-track">
                            <div
                              className="an-resp-fill"
                              style={{ width: m.count > 0 ? `${(m.responded / m.count) * 100}%` : '0%' }}
                            />
                          </div>
                          <span className="an-resp-pct">
                            {m.count > 0 ? `${Math.round((m.responded / m.count) * 100)}%` : '—'}
                          </span>
                        </div>
                      ))}
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
