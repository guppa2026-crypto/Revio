'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import RatingGoal from '@/components/RatingGoal'
import ReviewCalculator from '@/components/ReviewCalculator'

type Review = {
  id: string
  reviewer_name: string
  rating: number
  review_text: string
  sentiment: string
  risk_level: string
  status: string
  generated_reply: string
  created_at: string
}
type Stats = {
  total: number
  avgRating: number
  pendingCount: number
  autoReplied: number
}

function RiskBadge({ risk }: { risk: string }) {
  const styles: Record<string, string> = {
    low: 'badge badge-low',
    medium: 'badge badge-med',
    high: 'badge badge-high',
  }
  return <span className={styles[risk] ?? 'badge badge-low'}>{risk} risk</span>
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'badge badge-pending',
    approved: 'badge badge-approved',
    posted: 'badge badge-posted',
    rejected: 'badge badge-rejected',
    flagged: 'badge badge-high',
  }
  return <span className={styles[status] ?? 'badge badge-pending'}>{status}</span>
}

function initials(name: string) {
  return name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
}

const AVATAR_COLORS = [
  { bg: '#E6F1FB', color: '#185FA5' },
  { bg: '#E1F5EE', color: '#0F6E56' },
  { bg: '#FAEEDA', color: '#854F0B' },
  { bg: '#EEEDFE', color: '#534AB7' },
  { bg: '#FAECE7', color: '#993C1D' },
]

function avatarColor(name: string) {
  const i = name.charCodeAt(0) % AVATAR_COLORS.length
  return AVATAR_COLORS[i]
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return mins + 'm ago'
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return hrs + 'h ago'
  return Math.floor(hrs / 24) + 'd ago'
}

export default function DashboardPage() {
  const router = useRouter()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)
  const [filter, setFilter] = useState('all')
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [approving, setApproving] = useState<string | null>(null)

  // Location picker
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [accounts, setAccounts] = useState<any[]>([])
  const [selectedAccount, setSelectedAccount] = useState('')
  const [locations, setLocations] = useState<any[]>([])
  const [selectedLocation, setSelectedLocation] = useState('')
  const [loadingLocations, setLoadingLocations] = useState(false)
  const [savingLocation, setSavingLocation] = useState(false)
  const [locationSaved, setLocationSaved] = useState(false)

  // Manual import
  const [showImport, setShowImport] = useState(false)
  const [importName, setImportName] = useState('')
  const [importRating, setImportRating] = useState(5)
  const [importText, setImportText] = useState('')
  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError] = useState('')

  useEffect(() => {
    fetchReviews()
    if (typeof window !== 'undefined' && window.location.search.includes('google=connected')) {
      setShowLocationPicker(true)
      loadAccounts()
    }
  }, [])

  const fetchReviews = async () => {
    try {
      const res = await api.get('/reviews/')
      setReviews(res.data.reviews || res.data)
    } catch (err: any) {
      if (err.response?.status === 403) {
        setLocked(true)
      } else if (err.response?.status !== 401) {
        setLocked(false)
      }
    } finally {
      setLoading(false)
    }
  }

  const loadAccounts = async () => {
    try {
      const res = await api.get('/google/accounts')
      setAccounts(res.data.accounts || [])
    } catch {
      setAccounts([])
    }
  }

  const handleAccountChange = async (accountId: string) => {
    setSelectedAccount(accountId)
    setSelectedLocation('')
    setLocations([])
    if (!accountId) return
    setLoadingLocations(true)
    try {
      const res = await api.get(`/google/locations/${accountId}`)
      setLocations(res.data.locations || [])
    } catch {
      setLocations([])
    } finally {
      setLoadingLocations(false)
    }
  }

  const handleSaveLocation = async () => {
    if (!selectedAccount || !selectedLocation) return
    setSavingLocation(true)
    try {
      await api.post('/google/select-location', { account_id: selectedAccount, location_id: selectedLocation })
      setLocationSaved(true)
      setTimeout(() => {
        setShowLocationPicker(false)
        window.history.replaceState({}, '', '/dashboard')
      }, 1500)
    } catch {
      alert('Failed to save location. Please try again.')
    } finally {
      setSavingLocation(false)
    }
  }

  const handleApprove = async (id: string) => {
    setApproving(id)
    try {
      await api.post('/reviews/' + id + '/approve')
      await fetchReviews()
    } finally {
      setApproving(null)
    }
  }

  const handleReject = async (id: string) => {
    await api.post('/reviews/' + id + '/reject')
    fetchReviews()
  }

  const handleGoogleConnect = async () => {
    try {
      const res = await api.get('/google/connect')
      window.location.href = res.data.auth_url
    } catch {
      alert('Failed to start Google connection.')
    }
  }

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()
    setImportLoading(true)
    setImportError('')
    try {
      await api.post('/reviews/import', { reviewer_name: importName, rating: importRating, review_text: importText })
      setShowImport(false)
      setImportName('')
      setImportRating(5)
      setImportText('')
      await fetchReviews()
    } catch (err: any) {
      setImportError(err.response?.data?.detail || 'Failed to import review.')
    } finally {
      setImportLoading(false)
    }
  }

  const filtered = filter === 'all' ? reviews : reviews.filter((r: Review) => r.status === filter)

  const stats: Stats = {
    total: reviews.length,
    avgRating: reviews.length ? Math.round((reviews.reduce((s: number, r: Review) => s + r.rating, 0) / reviews.length) * 10) / 10 : 0,
    pendingCount: reviews.filter((r: Review) => r.status === 'pending').length,
    autoReplied: reviews.filter((r: Review) => r.status === 'posted').length,
  }

  const FILTERS = ['all', 'pending', 'flagged', 'approved', 'posted']

  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #F2F1EE; }
    .shell { min-height: 100vh; background: #F2F1EE; font-family: system-ui, -apple-system, sans-serif; }

    /* NAV */
    .nav { background: #1A1916; padding: 0 2rem; height: 60px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 10; box-shadow: 0 1px 0 rgba(255,255,255,0.06); }
    .nav-logo { font-size: 17px; font-weight: 600; color: #fff; display: flex; align-items: center; gap: 9px; }
    .nav-dot { width: 8px; height: 8px; border-radius: 50%; background: linear-gradient(135deg, #A89CF5, #7F77DD); box-shadow: 0 0 0 3px rgba(127,119,221,0.3); }
    .nav-actions { display: flex; align-items: center; gap: 6px; }
    .nav-btn { font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.65); border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.06); cursor: pointer; padding: 6px 13px; border-radius: 7px; font-family: inherit; transition: background 0.15s, color 0.15s; }
    .nav-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }
    .nav-signout { font-size: 13px; color: rgba(255,255,255,0.4); border: none; background: none; cursor: pointer; padding: 6px 10px; border-radius: 6px; font-family: inherit; }
    .nav-signout:hover { color: rgba(255,255,255,0.7); }

    /* PAGE */
    .page { max-width: 900px; margin: 0 auto; padding: 2rem 1.5rem; }

    /* STATS */
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 1.75rem; }
    .stat { background: #fff; border: 1px solid #E8E6E0; border-radius: 14px; padding: 18px 20px; position: relative; overflow: hidden; transition: box-shadow 0.2s; }
    .stat:hover { box-shadow: 0 4px 16px rgba(26,25,22,0.08); }
    .stat-icon { font-size: 18px; margin-bottom: 12px; opacity: 0.8; }
    .stat-label { font-size: 11px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase; color: #A8A49C; margin-bottom: 6px; }
    .stat-value { font-size: 30px; font-weight: 700; color: #1A1916; line-height: 1; letter-spacing: -0.02em; }
    .stat-sub { font-size: 12px; color: #C0BCB4; margin-top: 6px; }
    .stat-rating { background: linear-gradient(135deg, #EFEDFB 0%, #E6E3FA 100%); border-color: #D8D4F5; }
    .stat-rating .stat-value { background: linear-gradient(120deg, #7F77DD, #B3A0F2); -webkit-background-clip: text; background-clip: text; color: transparent; }
    .stat-pending { border-color: #F5E4C0; background: #FFFBF2; }
    .stat-pending .stat-value { color: #B07A12; }

    /* TOOLBAR */
    .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
    .section-title { font-size: 14px; font-weight: 600; color: #1A1916; }
    .toolbar-right { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .filters { display: flex; gap: 5px; flex-wrap: wrap; }
    .filter-btn { font-size: 12px; font-weight: 500; padding: 5px 12px; border-radius: 99px; border: 1px solid #E8E6E0; background: #fff; color: #9E9B93; cursor: pointer; text-transform: capitalize; transition: all 0.15s; }
    .filter-btn:hover { border-color: #C9C5BC; color: #555; }
    .filter-btn.active { background: #1A1916; color: #fff; border-color: #1A1916; }
    .btn-import { background: linear-gradient(135deg, #7F77DD, #6A61C9); color: #fff; border: none; font-size: 13px; font-weight: 500; padding: 7px 14px; border-radius: 8px; cursor: pointer; font-family: inherit; transition: opacity 0.15s; white-space: nowrap; }
    .btn-import:hover { opacity: 0.88; }

    /* REVIEW CARDS */
    .reviews { display: flex; flex-direction: column; gap: 10px; }
    .card { background: #fff; border: 1px solid #E8E6E0; border-radius: 16px; padding: 20px 22px; transition: box-shadow 0.2s; }
    .card:hover { box-shadow: 0 4px 20px rgba(26,25,22,0.07); }
    .card-flagged { border-color: #F2C4C4; background: linear-gradient(135deg, #FFFAFA, #FFF5F5); }
    .card-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; }
    .reviewer { display: flex; align-items: center; gap: 11px; }
    .avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
    .reviewer-name { font-size: 14px; font-weight: 600; color: #1A1916; }
    .reviewer-meta { font-size: 12px; color: #B8B4AC; margin-top: 2px; }
    .badges { display: flex; gap: 5px; align-items: center; }
    .badge { font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 99px; letter-spacing: 0.02em; }
    .badge-low { background: #E8F4DC; color: #3A6B10; }
    .badge-med { background: #FDE8C8; color: #8A5010; }
    .badge-high { background: #FCE8E8; color: #A32D2D; }
    .badge-pending { background: #FDE8C8; color: #8A5010; }
    .badge-approved { background: #E8F4DC; color: #3A6B10; }
    .badge-posted { background: #DCEcFB; color: #1A5FA5; }
    .badge-rejected { background: #EFEDE7; color: #5F5E5A; }
    .stars { color: #F0A020; font-size: 15px; margin-bottom: 10px; letter-spacing: 1px; }
    .review-text { font-size: 14px; color: #4A4844; line-height: 1.65; margin-bottom: 16px; }
    .reply-box { background: linear-gradient(135deg, #F7F6F3, #F3F1FC); border-radius: 11px; padding: 14px 16px; margin-bottom: 16px; border-left: 3px solid #7F77DD; }
    .reply-label { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #A8A49C; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; }
    .reply-label-pill { background: #EFEDFB; color: #6A61C9; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.05em; }
    .reply-label span { color: #7F77DD; cursor: pointer; font-size: 11px; font-weight: 500; text-transform: none; letter-spacing: 0; }
    .reply-text { font-size: 13px; color: #2C2C2A; line-height: 1.7; }
    .reply-edit { width: 100%; font-size: 13px; color: #2C2C2A; line-height: 1.65; background: #fff; border: 1px solid #C8C4BC; border-radius: 8px; padding: 10px 12px; resize: vertical; min-height: 80px; font-family: inherit; outline: none; }
    .reply-edit:focus { border-color: #7F77DD; }
    .flagged-banner { background: #FCE8E8; border: 1px solid #F2C4C4; border-radius: 9px; padding: 10px 14px; display: flex; align-items: center; gap: 8px; font-size: 13px; color: #A32D2D; font-weight: 500; }
    .actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .btn { font-size: 13px; font-weight: 500; padding: 8px 16px; border-radius: 9px; cursor: pointer; border: 1px solid transparent; font-family: inherit; transition: all 0.15s; }
    .btn-approve { background: #1A1916; color: #fff; border-color: #1A1916; }
    .btn-approve:hover { background: #333; }
    .btn-approve:disabled { opacity: 0.45; cursor: not-allowed; }
    .btn-edit { background: #fff; color: #555; border-color: #E8E6E0; }
    .btn-edit:hover { border-color: #C9C5BC; }
    .btn-reject { background: #fff; color: #A32D2D; border-color: #F2C4C4; }
    .btn-reject:hover { background: #FFF5F5; }

    /* EMPTY / LOADING */
    .empty { background: #fff; border: 1px solid #E8E6E0; border-radius: 16px; padding: 5rem 2rem; text-align: center; }
    .empty-icon { font-size: 32px; margin-bottom: 12px; opacity: 0.4; }
    .empty-title { font-size: 15px; font-weight: 600; color: #9E9B93; margin-bottom: 6px; }
    .empty-sub { font-size: 13px; color: #C0BCB4; }
    .loading { text-align: center; padding: 4rem; color: #B0ADA5; font-size: 14px; }

    /* PAYWALL */
    .paywall { background: #fff; border: 1px solid #E8E6E0; border-radius: 18px; padding: 4rem 2rem; text-align: center; position: relative; overflow: hidden; }
    .paywall::before { content: ''; position: absolute; top: -60px; left: 50%; transform: translateX(-50%); width: 400px; height: 300px; background: radial-gradient(ellipse at center, rgba(127,119,221,0.12), transparent 70%); pointer-events: none; }
    .paywall-title { font-size: 22px; font-weight: 700; color: #1A1916; margin-bottom: 8px; position: relative; }
    .paywall-text { font-size: 14px; color: #888; line-height: 1.65; margin-bottom: 24px; max-width: 380px; margin-left: auto; margin-right: auto; position: relative; }
    .paywall-btn { font-size: 14px; font-weight: 600; padding: 11px 28px; border-radius: 10px; cursor: pointer; border: none; background: linear-gradient(135deg, #1A1916, #2A2540); color: #fff; position: relative; transition: opacity 0.15s; box-shadow: 0 4px 14px rgba(26,25,22,0.2); }
    .paywall-btn:hover { opacity: 0.88; }

    /* LOCATION PICKER */
    .location-banner { background: #fff; border: 1px solid #DDD9F8; border-radius: 16px; padding: 22px 26px; margin-bottom: 1.75rem; box-shadow: 0 2px 12px rgba(127,119,221,0.1); }
    .location-banner-title { font-size: 15px; font-weight: 700; margin-bottom: 4px; color: #1A1916; }
    .location-banner-sub { font-size: 13px; color: #9E9B93; margin-bottom: 18px; }
    .location-row { display: flex; gap: 10px; align-items: flex-end; flex-wrap: wrap; }
    .location-field { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 160px; }
    .location-field label { font-size: 12px; font-weight: 600; color: #5F5E5A; }
    .location-field select { font-size: 13px; color: #1A1916; background: #F7F6F3; border: 1px solid #E8E6E0; border-radius: 9px; padding: 9px 11px; font-family: inherit; outline: none; cursor: pointer; }
    .location-field select:focus { border-color: #7F77DD; }
    .btn-save-loc { font-size: 13px; font-weight: 600; padding: 9px 20px; border-radius: 9px; cursor: pointer; border: none; background: #1A1916; color: #fff; font-family: inherit; white-space: nowrap; transition: background 0.15s; }
    .btn-save-loc:hover { background: #333; }
    .btn-save-loc:disabled { opacity: 0.45; cursor: not-allowed; }
    .location-saved { font-size: 13px; color: #3B6D11; font-weight: 600; background: #EAF3DE; padding: 10px 14px; border-radius: 9px; display: inline-block; }

    /* IMPORT MODAL */
    .modal-overlay { position: fixed; inset: 0; background: rgba(10,9,8,0.6); backdrop-filter: blur(4px); z-index: 50; display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
    .modal { background: #fff; border-radius: 18px; padding: 30px; width: 100%; max-width: 460px; box-shadow: 0 24px 80px rgba(26,25,22,0.22); }
    .modal-title { font-size: 17px; font-weight: 700; margin-bottom: 4px; }
    .modal-sub { font-size: 13px; color: #9E9B93; margin-bottom: 22px; }
    .modal-field { margin-bottom: 16px; }
    .modal-field label { display: block; font-size: 13px; font-weight: 600; color: #5F5E5A; margin-bottom: 6px; }
    .modal-field input, .modal-field textarea { width: 100%; font-size: 14px; color: #1A1916; background: #F7F6F3; border: 1px solid #E8E6E0; border-radius: 9px; padding: 10px 13px; font-family: inherit; outline: none; resize: vertical; transition: border-color 0.15s; }
    .modal-field input:focus, .modal-field textarea:focus { border-color: #7F77DD; background: #fff; }
    .modal-field textarea { min-height: 100px; }
    .star-picker { display: flex; gap: 4px; }
    .star-btn { font-size: 24px; background: none; border: none; cursor: pointer; padding: 0; line-height: 1; opacity: 0.2; transition: opacity 0.1s, transform 0.1s; }
    .star-btn.active { opacity: 1; }
    .star-btn:hover { transform: scale(1.15); }
    .modal-actions { display: flex; gap: 8px; margin-top: 8px; }
    .modal-error { font-size: 13px; color: #A32D2D; background: #FCE8E8; border-radius: 9px; padding: 10px 13px; margin-bottom: 16px; }

    @media (max-width: 640px) { .stats { grid-template-columns: repeat(2, 1fr); } .page { padding: 1rem; } .location-row { flex-direction: column; } .nav { padding: 0 1rem; } }
  `

  return (
    <>
      <style>{css}</style>
      <div className="shell">
        <nav className="nav">
          <div className="nav-logo">
            <div className="nav-dot" />
            Revio
          </div>
          <div className="nav-actions">
            <button className="nav-btn" onClick={handleGoogleConnect}>Connect Google</button>
            <button className="nav-btn" onClick={() => router.push('/settings')}>Settings</button>
            <button className="nav-btn" onClick={() => router.push('/billing')}>Billing</button>
            <button className="nav-signout" onClick={() => { localStorage.removeItem('token'); router.push('/login') }}>Sign out</button>
          </div>
        </nav>

        <div className="page">
          {locked ? (
            <div className="paywall">
              <div className="paywall-title">Upgrade to Pro</div>
              <div className="paywall-text">
                Review management is a Pro feature. Subscribe for £18/month to unlock unlimited reviews and AI replies.
              </div>
              <button className="paywall-btn" onClick={() => router.push('/billing')}>View plans</button>
            </div>
          ) : (
          <>
          {showLocationPicker && (
            <div className="location-banner">
              <div className="location-banner-title">Select your business location</div>
              <div className="location-banner-sub">Choose the one Google Business Profile location Revio will manage. This can be changed later from Settings.</div>
              {locationSaved ? (
                <div className="location-saved">✓ Location saved — reviews will start syncing shortly.</div>
              ) : (
                <div className="location-row">
                  <div className="location-field">
                    <label>Account</label>
                    <select value={selectedAccount} onChange={e => handleAccountChange(e.target.value)}>
                      <option value="">Select account…</option>
                      {accounts.map((a: any) => (
                        <option key={a.name} value={a.name}>{a.accountName || a.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="location-field">
                    <label>Location</label>
                    <select value={selectedLocation} onChange={e => setSelectedLocation(e.target.value)} disabled={!locations.length}>
                      <option value="">{loadingLocations ? 'Loading…' : 'Select location…'}</option>
                      {locations.map((l: any) => (
                        <option key={l.name} value={l.name}>{l.title || l.name}</option>
                      ))}
                    </select>
                  </div>
                  <button className="btn-save-loc" onClick={handleSaveLocation} disabled={!selectedAccount || !selectedLocation || savingLocation}>
                    {savingLocation ? 'Saving…' : 'Save location'}
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="stats">
            <div className="stat">
              <div className="stat-icon">📋</div>
              <div className="stat-label">Total reviews</div>
              <div className="stat-value">{stats.total}</div>
            </div>
            <div className="stat stat-rating">
              <div className="stat-icon">⭐</div>
              <div className="stat-label">Avg rating</div>
              <div className="stat-value">{stats.avgRating || '—'}</div>
              {stats.avgRating > 0 && <div className="stat-sub">out of 5.0</div>}
            </div>
            <div className={'stat' + (stats.pendingCount > 0 ? ' stat-pending' : '')}>
              <div className="stat-icon">⏳</div>
              <div className="stat-label">Pending approval</div>
              <div className="stat-value">{stats.pendingCount}</div>
              {stats.pendingCount > 0 && <div className="stat-sub">need your review</div>}
            </div>
            <div className="stat">
              <div className="stat-icon">✅</div>
              <div className="stat-label">Auto-posted</div>
              <div className="stat-value">{stats.autoReplied}</div>
            </div>
          </div>

          <RatingGoal rating={stats.avgRating} count={stats.total} />
          <ReviewCalculator />

          <div className="section-header">
            <span className="section-title">Reviews</span>
            <div className="toolbar-right">
              <button className="btn-import" onClick={() => setShowImport(true)}>+ Add manually</button>
              <div className="filters">
                {FILTERS.map(f => (
                  <button key={f} className={'filter-btn' + (filter === f ? ' active' : '')} onClick={() => setFilter(f)}>{f}</button>
                ))}
              </div>
            </div>
          </div>

          {loading && <div className="loading">Loading reviews…</div>}
          {!loading && filtered.length === 0 && (
            <div className="empty">
              <div className="empty-icon">📭</div>
              <div className="empty-title">No reviews here yet</div>
              <div className="empty-sub">Connect your Google Business Profile or add a review manually to get started.</div>
            </div>
          )}

          {!loading && (
            <div className="reviews">
              {filtered.map((review: Review) => {
                const av = avatarColor(review.reviewer_name)
                const isEditing = editing[review.id] !== undefined
                const replyText = isEditing ? editing[review.id] : review.generated_reply
                return (
                  <div key={review.id} className={'card' + (review.status === 'flagged' ? ' card-flagged' : '')}>
                    <div className="card-top">
                      <div className="reviewer">
                        <div className="avatar" style={{ background: av.bg, color: av.color }}>{initials(review.reviewer_name)}</div>
                        <div>
                          <div className="reviewer-name">{review.reviewer_name}</div>
                          <div className="reviewer-meta">{review.created_at ? timeAgo(review.created_at) : ''} · Google</div>
                        </div>
                      </div>
                      <div className="badges">
                        <RiskBadge risk={review.risk_level} />
                        <StatusBadge status={review.status} />
                      </div>
                    </div>

                    <div className="stars">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</div>
                    <p className="review-text">{review.review_text}</p>

                    {review.status === 'flagged' ? (
                      <div className="flagged-banner">⚠ Flagged for manual review — respond personally, do not auto-reply.</div>
                    ) : replyText ? (
                      <div className="reply-box">
                        <div className="reply-label">
                          <span className="reply-label-pill">AI Draft</span>
                          {review.status === 'pending' && (
                            <span onClick={() => isEditing
                              ? setEditing(e => { const n = { ...e }; delete n[review.id]; return n })
                              : setEditing(e => ({ ...e, [review.id]: review.generated_reply }))
                            }>{isEditing ? 'cancel' : 'edit'}</span>
                          )}
                        </div>
                        {isEditing
                          ? <textarea className="reply-edit" value={editing[review.id]} onChange={e => setEditing(ed => ({ ...ed, [review.id]: e.target.value }))} />
                          : <p className="reply-text">{replyText}</p>
                        }
                      </div>
                    ) : null}

                    {review.status === 'pending' && (
                      <div className="actions">
                        <button className="btn btn-approve" disabled={approving === review.id} onClick={() => handleApprove(review.id)}>
                          {approving === review.id ? 'Posting…' : 'Approve & post'}
                        </button>
                        {!isEditing && (
                          <button className="btn btn-edit" onClick={() => setEditing(e => ({ ...e, [review.id]: review.generated_reply }))}>Edit reply</button>
                        )}
                        <button className="btn btn-reject" onClick={() => handleReject(review.id)}>Reject</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          </>
          )}
        </div>
      </div>

      {showImport && (
        <div className="modal-overlay" onClick={() => setShowImport(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Add review manually</div>
            <div className="modal-sub">Paste in a review to generate an AI reply draft.</div>
            <form onSubmit={handleImport}>
              {importError && <div className="modal-error">{importError}</div>}
              <div className="modal-field">
                <label>Reviewer name</label>
                <input type="text" value={importName} onChange={e => setImportName(e.target.value)} required placeholder="e.g. Sarah M." />
              </div>
              <div className="modal-field">
                <label>Rating</label>
                <div className="star-picker">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} type="button" className={'star-btn' + (n <= importRating ? ' active' : '')} onClick={() => setImportRating(n)}>★</button>
                  ))}
                </div>
              </div>
              <div className="modal-field">
                <label>Review text</label>
                <textarea value={importText} onChange={e => setImportText(e.target.value)} required placeholder="Paste the review here…" />
              </div>
              <div className="modal-actions">
                <button className="btn btn-approve" type="submit" disabled={importLoading}>
                  {importLoading ? 'Processing…' : 'Import & generate reply'}
                </button>
                <button className="btn btn-edit" type="button" onClick={() => setShowImport(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
