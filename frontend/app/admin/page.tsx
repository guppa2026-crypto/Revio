'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

type Stats = {
  total_customers: number
  subscribed: number
  mrr: number
  total_reviews_processed: number
  new_signups_this_week: number
}

type Customer = {
  id: string
  name: string
  email: string
  is_subscribed: boolean
  is_active: boolean
  review_count: number
  created_at: string
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'today'
  if (days === 1) return '1d ago'
  if (days < 30) return days + 'd ago'
  return Math.floor(days / 30) + 'mo ago'
}

export default function AdminPage() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      api.get('/admin/stats'),
      api.get('/admin/customers'),
    ])
      .then(([statsRes, customersRes]) => {
        setStats(statsRes.data)
        setCustomers(customersRes.data.customers)
      })
      .catch((err) => {
        if (err.response?.status === 403) setError('Access denied.')
        else router.push('/login')
      })
      .finally(() => setLoading(false))
  }, [])

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@400;500;600&display=swap');
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    .shell { min-height: 100vh; background: #0D0D0D; font-family: 'DM Sans', sans-serif; color: #E8E6E0; }
    .nav { background: #0D0D0D; border-bottom: 1px solid #222; padding: 0 2rem; height: 52px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 10; }
    .nav-left { display: flex; align-items: center; gap: 12px; }
    .nav-logo { font-size: 15px; font-weight: 600; color: #E8E6E0; letter-spacing: -0.02em; }
    .nav-tag { font-family: 'DM Mono', monospace; font-size: 10px; background: #1E1E1E; color: #666; padding: 2px 8px; border-radius: 4px; border: 1px solid #2A2A2A; letter-spacing: 0.08em; }
    .nav-right { display: flex; gap: 8px; }
    .nav-btn { font-size: 12px; color: #555; border: 1px solid #222; background: none; cursor: pointer; padding: 5px 12px; border-radius: 6px; font-family: inherit; }
    .nav-btn:hover { color: #E8E6E0; border-color: #444; }
    .page { max-width: 1000px; margin: 0 auto; padding: 2.5rem 2rem; }
    .page-header { margin-bottom: 2rem; }
    .page-title { font-size: 24px; font-weight: 600; color: #E8E6E0; letter-spacing: -0.03em; }
    .page-sub { font-size: 13px; color: #555; margin-top: 4px; font-family: 'DM Mono', monospace; }
    .stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1px; background: #1A1A1A; border: 1px solid #1A1A1A; border-radius: 12px; overflow: hidden; margin-bottom: 2.5rem; }
    .stat { background: #111; padding: 20px 20px 18px; }
    .stat-label { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #444; margin-bottom: 10px; }
    .stat-value { font-size: 32px; font-weight: 600; color: #E8E6E0; letter-spacing: -0.04em; line-height: 1; }
    .stat-value.accent { color: #7FD6A0; }
    .stat-sub { font-size: 11px; color: #444; margin-top: 6px; font-family: 'DM Mono', monospace; }
    .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
    .section-title { font-size: 13px; font-weight: 500; color: #666; font-family: 'DM Mono', monospace; letter-spacing: 0.06em; text-transform: uppercase; }
    .count-badge { font-family: 'DM Mono', monospace; font-size: 11px; color: #444; }
    .table-wrap { border: 1px solid #1A1A1A; border-radius: 12px; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    thead { background: #111; }
    th { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #444; padding: 12px 16px; text-align: left; font-weight: 400; }
    tr { border-bottom: 1px solid #141414; }
    tr:last-child { border-bottom: none; }
    tbody tr { background: #0D0D0D; transition: background 0.1s; }
    tbody tr:hover { background: #111; }
    td { padding: 13px 16px; font-size: 13px; color: #AAA; vertical-align: middle; }
    .td-name { color: #E8E6E0; font-weight: 500; }
    .td-email { font-family: 'DM Mono', monospace; font-size: 11px; color: #555; }
    .td-mono { font-family: 'DM Mono', monospace; font-size: 11px; }
    .pill { font-size: 10px; font-weight: 500; padding: 3px 8px; border-radius: 4px; font-family: 'DM Mono', monospace; letter-spacing: 0.04em; }
    .pill-active { background: #0F2A1A; color: #7FD6A0; border: 1px solid #1A4029; }
    .pill-inactive { background: #1A1A1A; color: #444; border: 1px solid #222; }
    .loading { text-align: center; padding: 5rem; color: #333; font-family: 'DM Mono', monospace; font-size: 13px; }
    .error { text-align: center; padding: 5rem; color: #C06060; font-family: 'DM Mono', monospace; font-size: 13px; }
    @media (max-width: 768px) { .stats { grid-template-columns: repeat(2, 1fr); } .page { padding: 1.5rem 1rem; } }
  `

  return (
    <>
      <style>{css}</style>
      <div className="shell">
        <nav className="nav">
          <div className="nav-left">
            <span className="nav-logo">Revio</span>
            <span className="nav-tag">ADMIN</span>
          </div>
          <div className="nav-right">
            <button className="nav-btn" onClick={() => router.push('/dashboard')}>← Dashboard</button>
            <button className="nav-btn" onClick={() => api.post('/auth/logout').finally(() => router.push('/login'))}>Sign out</button>
          </div>
        </nav>

        <div className="page">
          <div className="page-header">
            <h1 className="page-title">Admin</h1>
            <p className="page-sub">revio-production-4d73.up.railway.app</p>
          </div>

          {loading && <div className="loading">loading...</div>}
          {error && <div className="error">{error}</div>}

          {!loading && !error && stats && (
            <>
              <div className="stats">
                <div className="stat">
                  <div className="stat-label">Total customers</div>
                  <div className="stat-value">{stats.total_customers}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Subscribed</div>
                  <div className="stat-value accent">{stats.subscribed}</div>
                  <div className="stat-sub">{stats.total_customers > 0 ? Math.round(stats.subscribed / stats.total_customers * 100) : 0}% conversion</div>
                </div>
                <div className="stat">
                  <div className="stat-label">MRR</div>
                  <div className="stat-value accent">£{stats.mrr}</div>
                  <div className="stat-sub">£{(stats.mrr * 12).toLocaleString()} ARR</div>
                </div>
                <div className="stat">
                  <div className="stat-label">Reviews processed</div>
                  <div className="stat-value">{stats.total_reviews_processed}</div>
                </div>
                <div className="stat">
                  <div className="stat-label">New this week</div>
                  <div className="stat-value">{stats.new_signups_this_week}</div>
                </div>
              </div>

              <div className="section-header">
                <span className="section-title">Customers</span>
                <span className="count-badge">{customers.length} total</span>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Plan</th>
                      <th>Reviews</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.length === 0 && (
                      <tr><td colSpan={5} style={{textAlign:'center',color:'#333',fontFamily:'DM Mono',fontSize:'12px',padding:'3rem'}}>no customers yet</td></tr>
                    )}
                    {customers.map(c => (
                      <tr key={c.id}>
                        <td className="td-name">{c.name}</td>
                        <td className="td-email">{c.email}</td>
                        <td>
                          <span className={`pill ${c.is_subscribed ? 'pill-active' : 'pill-inactive'}`}>
                            {c.is_subscribed ? 'PRO' : 'FREE'}
                          </span>
                        </td>
                        <td className="td-mono">{c.review_count}</td>
                        <td className="td-mono">{c.created_at ? timeAgo(c.created_at) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
