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
    .shell { min-height: 100vh; background: #F7F6F3; font-family: system-ui, sans-serif; }
    .nav { background: #fff; border-bottom: 1px solid #ECEAE4; padding: 0 2rem; height: 56px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 10; }
    .nav-logo { font-size: 17px; font-weight: 600; color: #1A1916; display: flex; align-items: center; gap: 8px; }
    .nav-dot { width: 8px; height: 8px; border-radius: 50%; background: #7F77DD; }
    .nav-signout { font-size: 13px; color: #888; border: none; background: none; cursor: pointer; padding: 6px 10px; border-radius: 6px; }
    .nav-signout:hover { background: #F7F6F3; color: #444; }
    .page { max-width: 860px; margin: 0 auto; padding: 2rem 1.5rem; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 2rem; }
    .stat { background: #fff; border: 1px solid #ECEAE4; border-radius: 12px; padding: 16px 18px; }
    .stat-label { font-size: 11px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: #9E9B93; margin-bottom: 6px; }
    .stat-value { font-size: 28px; font-weight: 600; color: #1A1916; line-height: 1; }
    .stat-sub { font-size: 12px; color: #B0ADA5; margin-top: 5px; }
    .stat-pending .stat-value { color: #BA7517; }
    .toolbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
    .toolbar-title { font-size: 15px; font-weight: 600; color: #1A1916; }
    .filters { display: flex; gap: 6px; flex-wrap: wrap; }
    .filter-btn { font-size: 12px; font-weight: 500; padding: 5px 12px; border-radius: 99px; border: 1px solid #ECEAE4; background: #fff; color: #888; cursor: pointer; text-transform: capitalize; }
    .filter-btn.active { background: #1A1916; color: #fff; border-color: #1A1916; }
    .reviews { display: flex; flex-direction: column; gap: 12px; }
    .card { background: #fff; border: 1px solid #ECEAE4; border-radius: 14px; padding: 18px 20px; }
    .card-flagged { border-color: #F7C1C1; background: #FFFAFA; }
    .card-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
    .reviewer { display: flex; align-items: center; gap: 10px; }
    .avatar { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; flex-shrink: 0; }
    .reviewer-name { font-size: 14px; font-weight: 600; color: #1A1916; }
    .reviewer-meta { font-size: 12px; color: #B0ADA5; margin-top: 1px; }
    .badges { display: flex; gap: 6px; align-items: center; }
    .badge { font-size: 11px; font-weight: 500; padding: 3px 9px; border-radius: 99px; }
    .badge-low { background: #EAF3DE; color: #3B6D11; }
    .badge-med { background: #FAEEDA; color: #854F0B; }
    .badge-high { background: #FCEBEB; color: #A32D2D; }
    .badge-pending { background: #FAEEDA; color: #854F0B; }
    .badge-approved { background: #EAF3DE; color: #3B6D11; }
    .badge-posted { background: #E6F1FB; color: #185FA5; }
    .badge-rejected { background: #F1EFE8; color: #5F5E5A; }
    .stars { color: #EF9F27; font-size: 14px; margin-bottom: 8px; }
    .review-text { font-size: 14px; color: #4A4844; line-height: 1.6; margin-bottom: 14px; }
    .reply-box { background: #F7F6F3; border-radius: 10px; padding: 12px 14px; margin-bottom: 14px; border-left: 2.5px solid #7F77DD; }
    .reply-label { font-size: 11px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; color: #9E9B93; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between; }
    .reply-label span { color: #7F77DD; cursor: pointer; }
    .reply-text { font-size: 13px; color: #2C2C2A; line-height: 1.65; }
    .reply-edit { width: 100%; font-size: 13px; color: #2C2C2A; line-height: 1.65; background: #fff; border: 1px solid #C8C4BC; border-radius: 8px; padding: 10px 12px; resize: vertical; min-height: 80px; font-family: inherit; outline: none; }
    .flagged-banner { background: #FCEBEB; border: 1px solid #F7C1C1; border-radius: 8px; padding: 10px 14px; display: flex; align-items: center; gap: 8px; font-size: 13px; color: #A32D2D; font-weight: 500; }
    .actions { display: flex; gap: 8px; }
    .btn { font-size: 13px; font-weight: 500; padding: 7px 16px; border-radius: 8px; cursor: pointer; border: 1px solid transparent; font-family: inherit; }
    .btn-approve { background: #1A1916; color: #fff; border-color: #1A1916; }
    .btn-approve:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-edit { background: #fff; color: #444; border-color: #ECEAE4; }
    .btn-reject { background: #fff; color: #A32D2D; border-color: #F7C1C1; }
    .btn-import { background: #fff; color: #444; border: 1px solid #ECEAE4; font-size: 13px; font-weight: 500; padding: 6px 14px; border-radius: 8px; cursor: pointer; font-family: inherit; }
    .btn-import:hover { background: #F7F6F3; }
    .empty { background: #fff; border: 1px solid #ECEAE4; border-radius: 14px; padding: 4rem; text-align: center; color: #B0ADA5; font-size: 14px; }
    .loading { text-align: center; padding: 4rem; color: #B0ADA5; font-size: 14px; }
    .paywall { background: #fff; border: 1px solid #ECEAE4; border-radius: 14px; padding: 3.5rem 2rem; text-align: center; }
    .paywall-title { font-size: 20px; font-weight: 600; color: #1A1916; margin-bottom: 8px; }
    .paywall-text { font-size: 14px; color: #888; line-height: 1.6; margin-bottom: 20px; max-width: 380px; margin-left: auto; margin-right: auto; }
    .paywall-btn { font-size: 14px; font-weight: 500; padding: 9px 22px; border-radius: 8px; cursor: pointer; border: none; background: #1A1916; color: #fff; }
    .location-banner { background: #fff; border: 1px solid #E0DCFA; border-left: 3px solid #7F77DD; border-radius: 14px; padding: 20px 24px; margin-bottom: 2rem; }
    .location-banner-title { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
    .location-banner-sub { font-size: 13px; color: #9E9B93; margin-bottom: 16px; }
    .location-row { display: flex; gap: 10px; align-items: flex-end; flex-wrap: wrap; }
    .location-field { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 160px; }
    .location-field label { font-size: 12px; font-weight: 500; color: #5F5E5A; }
    .location-field select { font-size: 13px; color: #1A1916; background: #FAF9F6; border: 1px solid #ECEAE4; border-radius: 8px; padding: 8px 10px; font-family: inherit; outline: none; cursor: pointer; }
    .location-field select:focus { border-color: #7F77DD; }
    .btn-save-loc { font-size: 13px; font-weight: 500; padding: 8px 18px; border-radius: 8px; cursor: pointer; border: none; background: #1A1916; color: #fff; font-family: inherit; white-space: nowrap; }
    .btn-save-loc:disabled { opacity: 0.5; cursor: not-allowed; }
    .location-saved { font-size: 13px; color: #3B6D11; font-weight: 500; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(26,25,22,0.5); z-index: 50; display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
    .modal { background: #fff; border-radius: 16px; padding: 28px; width: 100%; max-width: 460px; box-shadow: 0 20px 60px rgba(26,25,22,0.2); }
    .modal-title { font-size: 17px; font-weight: 600; margin-bottom: 4px; }
    .modal-sub { font-size: 13px; color: #9E9B93; margin-bottom: 20px; }
    .modal-field { margin-bottom: 14px; }
    .modal-field label { display: block; font-size: 13px; font-weight: 500; color: #5F5E5A; margin-bottom: 6px; }
    .modal-field input, .modal-field textarea { width: 100%; font-size: 14px; color: #1A1916; background: #FAF9F6; border: 1px solid #ECEAE4; border-radius: 8px; padding: 10px 12px; font-family: inherit; outline: none; resize: vertical; }
    .modal-field input:focus, .modal-field textarea:focus { border-color: #7F77DD; background: #fff; }
    .modal-field textarea { min-height: 100px; }
    .star-picker { display: flex; gap: 6px; }
    .star-btn { font-size: 22px; background: none; border: none; cursor: pointer; padding: 0; line-height: 1; opacity: 0.3; transition: opacity 0.1s; }
    .star-btn.active { opacity: 1; }
    .modal-actions { display: flex; gap: 8px; margin-top: 6px; }
    .modal-error { font-size: 13px; color: #A32D2D; background: #FCEBEB; border-radius: 8px; padding: 10px 12px; margin-bottom: 14px; }
    @media (max-width: 640px) { .stats { grid-template-columns: repeat(2, 1fr); } .page { padding: 1rem; } .location-row { flex-direction: column; } }
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
          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
            <button onClick={handleGoogleConnect} style={{fontSize:'13px',color:'#444',border:'1px solid #ECEAE4',background:'#fff',cursor:'pointer',padding:'6px 12px',borderRadius:'6px'}}>Connect Google</button>
            <button onClick={() => router.push('/settings')} style={{fontSize:'13px',color:'#444',border:'1px solid #ECEAE4',background:'#fff',cursor:'pointer',padding:'6px 12px',borderRadius:'6px'}}>Settings</button>
            <button onClick={() => router.push('/billing')} style={{fontSize:'13px',color:'#444',border:'1px solid #ECEAE4',background:'#fff',cursor:'pointer',padding:'6px 12px',borderRadius:'6px'}}>Billing</button>
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
              <div className="location-banner-sub">Choose which Google Business Profile location Revio should manage.</div>
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
              <div className="stat-label">Total reviews</div>
              <div className="stat-value">{stats.total}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Avg rating</div>
              <div className="stat-value">{stats.avgRating || '—'}</div>
              {stats.avgRating > 0 && <div className="stat-sub">{'★'.repeat(Math.round(stats.avgRating))}{'☆'.repeat(5 - Math.round(stats.avgRating))}</div>}
            </div>
            <div className={'stat' + (stats.pendingCount > 0 ? ' stat-pending' : '')}>
              <div className="stat-label">Pending approval</div>
              <div className="stat-value">{stats.pendingCount}</div>
              {stats.pendingCount > 0 && <div className="stat-sub">need your review</div>}
            </div>
            <div className="stat">
              <div className="stat-label">Auto-posted</div>
              <div className="stat-value">{stats.autoReplied}</div>
            </div>
          </div>

          <RatingGoal rating={stats.avgRating} count={stats.total} />
          <ReviewCalculator />

          <div className="toolbar">
            <span className="toolbar-title">Reviews</span>
            <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
              <button className="btn-import" onClick={() => setShowImport(true)}>+ Add review manually</button>
              <div className="filters">
                {FILTERS.map(f => (
                  <button key={f} className={'filter-btn' + (filter === f ? ' active' : '')} onClick={() => setFilter(f)}>{f}</button>
                ))}
              </div>
            </div>
          </div>

          {loading && <div className="loading">Loading reviews…</div>}
          {!loading && filtered.length === 0 && <div className="empty">No reviews here yet.</div>}

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
                          AI draft reply
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
