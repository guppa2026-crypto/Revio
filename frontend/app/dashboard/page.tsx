'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Star, Clock, CreditCard, Settings, LogOut, Plus,
  AlertTriangle, LayoutDashboard, RefreshCw, X, Menu, Search, TrendingUp, BarChart2,
} from 'lucide-react'
import api from '@/lib/api'
import RatingGoal from '@/components/RatingGoal'

type BillingInfo = {
  is_subscribed: boolean
  is_trial: boolean
  trial_days_remaining: number
}

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
  reply_at?: string
}

function initials(name: string) {
  return name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
}

const AVATAR_COLORS = [
  { bg: '#EEF2FF', color: '#4F46E5' },
  { bg: '#F0FDF4', color: '#16A34A' },
  { bg: '#FFF7ED', color: '#C2410C' },
  { bg: '#FDF4FF', color: '#9333EA' },
  { bg: '#FFF1F2', color: '#BE123C' },
]

function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function timeUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now()
  if (diff <= 0) return 'any moment'
  const hrs = Math.floor(diff / 3600000)
  if (hrs < 1) return 'less than 1h'
  if (hrs < 24) return `~${hrs}h`
  return `~${Math.floor(hrs / 24)}d`
}

const RISK_BORDER: Record<string, string> = {
  low: '#22C55E',
  medium: '#F59E0B',
  high: '#EF4444',
}

const STATUS_PILL: Record<string, { bg: string; color: string; label: string }> = {
  pending:    { bg: '#FEF3C7', color: '#92400E', label: 'Pending' },
  scheduled:  { bg: '#EDE9FE', color: '#5B21B6', label: 'Scheduled' },
  approved:   { bg: '#DCFCE7', color: '#166534', label: 'Approved' },
  posted:     { bg: '#DBEAFE', color: '#1E40AF', label: 'Posted' },
  rejected:   { bg: '#F1F5F9', color: '#475569', label: 'Rejected' },
  flagged:    { bg: '#FEE2E2', color: '#991B1B', label: 'Flagged' },
  processing: { bg: '#EEF2FF', color: '#3730A3', label: 'Processing' },
}

const FILTERS = ['all', 'needs-action', 'scheduled', 'archive']
const FILTER_LABELS: Record<string, string> = {
  'all': 'All',
  'needs-action': 'Needs action',
  'scheduled': 'Scheduled',
  'archive': 'Archive',
}

const PAGE_SIZE = 20

export default function DashboardPage() {
  const router = useRouter()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE)
  const [editing, setEditing] = useState<Record<string, string>>({})
  const [approving, setApproving] = useState<string | null>(null)
  const [regenerating, setRegenerating] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null)

  // Location picker
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [accounts, setAccounts] = useState<any[]>([])
  const [accountsError, setAccountsError] = useState('')
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

  const fetchReviews = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    try {
      const res = await api.get('/reviews/')
      setReviews(res.data.reviews || res.data)
    } catch (err: any) {
      if (err.response?.status === 403) setLocked(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchReviews()
    api.get('/billing/status').then(r => setBillingInfo(r.data)).catch(() => {})
    if (typeof window !== 'undefined' && window.location.search.includes('google=connected')) {
      setShowLocationPicker(true)
      loadAccounts()
    }
  }, [fetchReviews])

  // Silent background refresh every 60s so new Google reviews appear automatically
  useEffect(() => {
    const id = setInterval(() => fetchReviews(), 60000)
    return () => clearInterval(id)
  }, [fetchReviews])

  // Fast poll every 3s while any review is still being AI-processed
  useEffect(() => {
    if (!reviews.some(r => r.status === 'processing')) return
    const id = setInterval(() => fetchReviews(), 3000)
    return () => clearInterval(id)
  }, [reviews, fetchReviews])

  // Reset pagination when filter or search changes
  useEffect(() => { setDisplayCount(PAGE_SIZE) }, [filter, searchQuery])

  const loadAccounts = async () => {
    setAccountsError('')
    try {
      const res = await api.get('/google/accounts')
      const list = res.data.accounts || []
      setAccounts(list)
      if (list.length === 0) setAccountsError('No Google Business accounts found. Make sure you connected the right Google account.')
    } catch {
      setAccounts([])
      setAccountsError('Google API access is pending approval. Once approved by Google, disconnect and reconnect to load your location.')
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
    } catch { setLocations([]) }
    finally { setLoadingLocations(false) }
  }

  const handleSaveLocation = async () => {
    if (!selectedAccount || !selectedLocation) return
    setSavingLocation(true)
    try {
      await api.post('/google/select-location', { account_id: selectedAccount, location_id: selectedLocation })
      setLocationSaved(true)
      setTimeout(() => { setShowLocationPicker(false); window.history.replaceState({}, '', '/dashboard') }, 1500)
    } catch { alert('Failed to save location. Please try again.') }
    finally { setSavingLocation(false) }
  }

  const handleApprove = async (id: string) => {
    setApproving(id)
    try { await api.post('/reviews/' + id + '/approve'); await fetchReviews() }
    finally { setApproving(null) }
  }

  const handleReject = async (id: string) => {
    await api.post('/reviews/' + id + '/reject')
    fetchReviews()
  }

  const handleCancelSchedule = async (id: string) => {
    await api.post('/reviews/' + id + '/cancel-schedule')
    fetchReviews()
  }

  const handleRegenerate = async (id: string) => {
    setRegenerating(id)
    try {
      const res = await api.post('/reviews/' + id + '/regenerate')
      setReviews(prev => prev.map(r => r.id === id ? { ...r, generated_reply: res.data.generated_reply } : r))
      setEditing(e => { const n = { ...e }; delete n[id]; return n })
    } finally { setRegenerating(null) }
  }

  const handleGoogleConnect = async () => {
    try { const res = await api.get('/google/connect'); window.location.href = res.data.auth_url }
    catch { alert('Failed to start Google connection.') }
  }

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()
    setImportLoading(true)
    setImportError('')
    try {
      await api.post('/reviews/import', { reviewer_name: importName, rating: importRating, review_text: importText })
      setShowImport(false); setImportName(''); setImportRating(5); setImportText('')
      await fetchReviews()
    } catch (err: any) {
      setImportError(err.response?.data?.detail || 'Failed to import review.')
    } finally { setImportLoading(false) }
  }

  // Derived stats
  const avgRating = reviews.length
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : 0
  const needsActionCount = reviews.filter(r => r.status === 'pending' || r.status === 'flagged').length
  const scheduledCount = reviews.filter(r => r.status === 'scheduled').length
  const thisWeek = reviews.filter(r => Date.now() - new Date(r.created_at).getTime() < 7 * 86400000).length
  const responseRate = reviews.length
    ? Math.round((reviews.filter(r => ['posted', 'approved', 'scheduled'].includes(r.status)).length / reviews.length) * 100)
    : 0

  // Filtered + searched list
  const filtered = reviews
    .filter(r => {
      if (filter === 'needs-action') return r.status === 'pending' || r.status === 'flagged'
      if (filter === 'archive') return ['approved', 'posted', 'rejected'].includes(r.status)
      if (filter === 'scheduled') return r.status === 'scheduled'
      return true
    })
    .filter(r => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return r.reviewer_name.toLowerCase().includes(q) || (r.review_text || '').toLowerCase().includes(q)
    })

  const displayed = filtered.slice(0, displayCount)

  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; }
    .layout { display: flex; min-height: 100vh; background: #F5F4F1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

    /* SIDEBAR */
    .sidebar { width: 228px; background: #0F0F0E; display: flex; flex-direction: column; position: fixed; top: 0; left: 0; height: 100vh; z-index: 30; border-right: 1px solid rgba(255,255,255,0.06); transition: transform 0.2s ease; }
    .sidebar-backdrop { display: none; }
    .nav-toggle { display: none; }
    .sidebar-logo { padding: 22px 20px 20px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid rgba(255,255,255,0.06); margin-bottom: 8px; }
    .logo-mark { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .logo-mark img { width: 28px; height: 28px; object-fit: contain; }
    .logo-name { font-size: 15px; font-weight: 700; color: #fff; letter-spacing: -0.01em; }
    .sidebar-nav { flex: 1; padding: 4px 10px; display: flex; flex-direction: column; gap: 2px; }
    .nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; font-size: 13.5px; font-weight: 500; color: rgba(255,255,255,0.5); cursor: pointer; border: none; background: none; font-family: inherit; text-decoration: none; transition: background 0.15s, color 0.15s; width: 100%; text-align: left; }
    .nav-item:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.85); }
    .nav-item.active { background: rgba(255,255,255,0.1); color: #fff; font-weight: 600; }
    .nav-item.active svg { color: rgba(255,255,255,0.9); }
    .nav-badge { margin-left: auto; background: #E10E1C; color: #fff; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 99px; min-width: 18px; text-align: center; line-height: 15px; flex-shrink: 0; }
    .nav-item svg { flex-shrink: 0; }
    .nav-section { font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.22); padding: 16px 12px 6px; }
    .sidebar-bottom { padding: 10px; border-top: 1px solid rgba(255,255,255,0.06); }
    .nav-signout { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; font-size: 13.5px; font-weight: 500; color: rgba(255,255,255,0.35); cursor: pointer; border: none; background: none; font-family: inherit; width: 100%; transition: color 0.15s; }
    .nav-signout:hover { color: rgba(255,255,255,0.6); }

    /* MAIN */
    .main { margin-left: 228px; flex: 1; display: flex; flex-direction: column; min-height: 100vh; }

    /* TOPBAR */
    .topbar { background: #F5F4F1; border-bottom: 1px solid #E5E3DC; padding: 0 28px; height: 58px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 10; }
    .topbar-left { display: flex; align-items: center; }
    .topbar-title { font-size: 16px; font-weight: 700; color: #1A1916; letter-spacing: -0.01em; }
    .topbar-actions { display: flex; align-items: center; gap: 8px; }
    .btn-ghost { font-size: 13px; font-weight: 500; color: #6B6963; border: 1px solid #E0DED7; background: #fff; padding: 7px 14px; border-radius: 8px; cursor: pointer; font-family: inherit; display: flex; align-items: center; gap: 6px; transition: border-color 0.15s, color 0.15s; }
    .btn-ghost:hover { border-color: #C9C5BC; color: #1A1916; }
    .btn-primary { font-size: 13px; font-weight: 600; color: #fff; background: #1A1916; border: none; padding: 7px 14px; border-radius: 8px; cursor: pointer; font-family: inherit; display: flex; align-items: center; gap: 6px; transition: background 0.15s; }
    .btn-primary:hover { background: #2D2D2A; }

    /* CONTENT */
    .content { padding: 24px 28px; flex: 1; }

    /* STATS GRID */
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
    .metric-card { background: #fff; border: 1px solid #E8E6E0; border-radius: 14px; padding: 20px 22px; }
    .metric-card.metric-alert { border-color: #FECACA; background: #FFFBFB; }
    .metric-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }
    .mi-gray  { background: #F5F4F1; color: #6B6963; }
    .mi-amber { background: #FEF9EC; color: #D97706; }
    .mi-red   { background: #FEF2F2; color: #DC2626; }
    .mi-green { background: #F0FDF4; color: #16A34A; }
    .mi-blue  { background: #EFF6FF; color: #2563EB; }
    .metric-label { font-size: 11px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; color: #A8A49C; margin-bottom: 8px; }
    .metric-value { font-size: 30px; font-weight: 700; color: #1A1916; letter-spacing: -0.03em; line-height: 1; }
    .metric-card.metric-alert .metric-value { color: #DC2626; }
    .metric-sub { font-size: 12px; color: #B8B4AC; margin-top: 5px; }
    .metric-sub-up { font-size: 12px; color: #16A34A; margin-top: 5px; font-weight: 500; }

    /* PAYWALL */
    .paywall { background: #fff; border: 1px solid #E5E3DC; border-radius: 16px; padding: 5rem 2rem; text-align: center; }
    .paywall h2 { font-size: 20px; font-weight: 700; color: #1A1916; margin-bottom: 8px; }
    .paywall p { font-size: 14px; color: #8A8780; line-height: 1.65; margin-bottom: 24px; max-width: 360px; margin-left: auto; margin-right: auto; }
    .paywall-btn { font-size: 14px; font-weight: 600; padding: 10px 26px; border-radius: 9px; cursor: pointer; border: none; background: #1A1916; color: #fff; }

    /* LOCATION PICKER */
    .location-bar { background: #EEF2FF; border: 1px solid #C7D2FE; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .location-bar-text { flex: 1; }
    .location-bar-title { font-size: 14px; font-weight: 600; color: #1A1916; margin-bottom: 2px; }
    .location-bar-sub { font-size: 12px; color: #6B6963; }
    .location-selects { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .loc-select { font-size: 13px; color: #1A1916; background: #fff; border: 1px solid #E0DED7; border-radius: 8px; padding: 7px 10px; font-family: inherit; outline: none; cursor: pointer; }
    .loc-select:focus { border-color: #E10E1C; }
    .btn-save-loc { font-size: 13px; font-weight: 600; padding: 8px 16px; border-radius: 8px; cursor: pointer; border: none; background: #E10E1C; color: #fff; font-family: inherit; white-space: nowrap; }
    .btn-save-loc:disabled { opacity: 0.45; cursor: not-allowed; }
    .loc-saved { font-size: 13px; font-weight: 600; color: #166534; }

    /* SEARCH + FILTER ROW */
    .search-filter-row { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .search-wrap { position: relative; flex: 1; min-width: 180px; max-width: 300px; }
    .search-icon-abs { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: #A8A49C; pointer-events: none; }
    .search-input { width: 100%; font-size: 13px; color: #1A1916; background: #fff; border: 1px solid #E0DED7; border-radius: 9px; padding: 7px 12px 7px 34px; font-family: inherit; outline: none; transition: border-color 0.15s; }
    .search-input::placeholder { color: #B8B4AC; }
    .search-input:focus { border-color: #1A1916; }
    .filter-tabs { display: flex; gap: 2px; background: #ECEAE4; border-radius: 10px; padding: 3px; }
    .filter-tab { font-size: 12.5px; font-weight: 500; padding: 6px 14px; border-radius: 8px; border: none; background: transparent; color: #8A8780; cursor: pointer; font-family: inherit; transition: all 0.15s; white-space: nowrap; }
    .filter-tab.active { background: #fff; color: #1A1916; font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .filter-tab-badge { display: inline-flex; align-items: center; justify-content: center; background: #E10E1C; color: #fff; font-size: 10px; font-weight: 700; border-radius: 99px; min-width: 16px; height: 16px; padding: 0 5px; margin-left: 5px; line-height: 1; }
    .filter-tab.active .filter-tab-badge { background: #E10E1C; }

    /* REVIEWS */
    .reviews-list { display: flex; flex-direction: column; gap: 8px; }
    .review-card { background: #fff; border: 1px solid #E5E3DC; border-radius: 14px; overflow: hidden; transition: box-shadow 0.2s; display: flex; }
    .review-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
    .review-risk-bar { width: 3px; flex-shrink: 0; }
    .review-body { flex: 1; padding: 18px 20px; }
    .review-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; gap: 12px; }
    .reviewer-info { display: flex; align-items: center; gap: 11px; }
    .avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; letter-spacing: 0.02em; }
    .reviewer-name { font-size: 14px; font-weight: 600; color: #1A1916; margin-bottom: 3px; }
    .reviewer-meta { font-size: 12px; color: #B8B4AC; display: flex; align-items: center; gap: 8px; }
    .review-meta-sep { color: #D8D4CC; }
    .stars-row { display: flex; align-items: center; gap: 1px; }
    .star-filled { color: #F59E0B; }
    .star-empty { color: #E5E3DC; }
    .review-badges { display: flex; gap: 6px; align-items: center; flex-shrink: 0; }
    .pill { font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 99px; white-space: nowrap; }
    .review-text { font-size: 14px; color: #4A4844; line-height: 1.65; margin-bottom: 14px; }
    .reply-section { background: #F9F8F6; border-radius: 10px; padding: 14px 16px; margin-bottom: 14px; position: relative; }
    .reply-section::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: #E10E1C; border-radius: 3px 0 0 3px; }
    .reply-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .reply-tag { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #E10E1C; background: #FDECEC; padding: 2px 8px; border-radius: 5px; }
    .reply-edit-btn { font-size: 12px; color: #8A8780; border: none; background: none; cursor: pointer; font-family: inherit; padding: 0; }
    .reply-edit-btn:hover { color: #1A1916; }
    .reply-regen-btn { font-size: 12px; color: #8A8780; border: none; background: none; cursor: pointer; font-family: inherit; padding: 0; display: flex; align-items: center; gap: 4px; }
    .reply-regen-btn:hover { color: #E10E1C; }
    .reply-regen-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .spin { animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .reply-text { font-size: 13px; color: #3A3834; line-height: 1.7; }
    .reply-textarea { width: 100%; font-size: 13px; color: #1A1916; line-height: 1.65; background: #fff; border: 1px solid #D0CEC7; border-radius: 8px; padding: 10px 12px; resize: vertical; min-height: 80px; font-family: inherit; outline: none; }
    .reply-textarea:focus { border-color: #E10E1C; }
    .flagged-notice { background: #FEF2F2; border: 1px solid #FECACA; border-radius: 9px; padding: 10px 14px; display: flex; align-items: center; gap: 8px; font-size: 13px; color: #B91C1C; font-weight: 500; margin-bottom: 14px; }
    .scheduled-notice { background: #F5F3FF; border: 1px solid #DDD6FE; border-radius: 9px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 13px; color: #5B21B6; font-weight: 500; margin-bottom: 14px; }
    .btn-cancel-schedule { font-size: 12px; font-weight: 500; padding: 4px 10px; border-radius: 6px; cursor: pointer; border: 1px solid #C4B5FD; background: #fff; color: #7C3AED; font-family: inherit; white-space: nowrap; flex-shrink: 0; }
    .btn-cancel-schedule:hover { background: #F5F3FF; }
    .review-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .btn-approve { font-size: 13px; font-weight: 600; padding: 7px 16px; border-radius: 8px; cursor: pointer; border: none; background: #1A1916; color: #fff; font-family: inherit; transition: background 0.15s; }
    .btn-approve:hover { background: #333; }
    .btn-approve:disabled { opacity: 0.45; cursor: not-allowed; }
    .btn-edit-reply { font-size: 13px; font-weight: 500; padding: 7px 16px; border-radius: 8px; cursor: pointer; border: 1px solid #E5E3DC; background: #fff; color: #4A4844; font-family: inherit; }
    .btn-reject { font-size: 13px; font-weight: 500; padding: 7px 16px; border-radius: 8px; cursor: pointer; border: 1px solid #FECACA; background: #fff; color: #DC2626; font-family: inherit; }
    .btn-reject:hover { background: #FEF2F2; }

    /* PROCESSING */
    .processing-notice { display: flex; align-items: center; gap: 10px; padding: 12px 16px; background: #F8F8FF; border: 1px dashed #C7D2FE; border-radius: 10px; font-size: 13px; color: #4338CA; font-weight: 500; }
    .processing-dots { display: flex; gap: 4px; }
    .processing-dot { width: 5px; height: 5px; border-radius: 50%; background: #6366F1; }
    .processing-dot:nth-child(1) { animation: pdot 1.2s 0.0s ease-in-out infinite; }
    .processing-dot:nth-child(2) { animation: pdot 1.2s 0.2s ease-in-out infinite; }
    .processing-dot:nth-child(3) { animation: pdot 1.2s 0.4s ease-in-out infinite; }
    @keyframes pdot { 0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); } 40% { opacity: 1; transform: scale(1.1); } }

    /* LOAD MORE */
    .load-more-row { display: flex; justify-content: center; padding: 20px 0 4px; }
    .btn-load-more { font-size: 13px; font-weight: 500; color: #6B6963; border: 1px solid #E0DED7; background: #fff; padding: 8px 20px; border-radius: 8px; cursor: pointer; font-family: inherit; transition: border-color 0.15s, color 0.15s; }
    .btn-load-more:hover { border-color: #1A1916; color: #1A1916; }
    .results-count { font-size: 12px; color: #B8B4AC; margin-bottom: 12px; }

    /* EMPTY */
    .empty-state { background: #fff; border: 1px solid #E5E3DC; border-radius: 14px; padding: 5rem 2rem; text-align: center; }
    .empty-state h3 { font-size: 15px; font-weight: 600; color: #6B6963; margin-bottom: 6px; }
    .empty-state p { font-size: 13px; color: #B8B4AC; max-width: 300px; margin: 0 auto; line-height: 1.6; }
    .loading-state { text-align: center; padding: 4rem; color: #B8B4AC; font-size: 14px; }
    @keyframes dash-spin { to { transform: rotate(360deg); } }
    .loading-spinner { width: 28px; height: 28px; border: 2.5px solid #E8E6E0; border-top-color: #E10E1C; border-radius: 50%; animation: dash-spin 0.7s linear infinite; margin: 4rem auto; }
    .empty-state-btn { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #fff; background: #1A1916; border: none; border-radius: 9px; padding: 9px 18px; cursor: pointer; font-family: inherit; margin-top: 16px; transition: background 0.15s; }
    .empty-state-btn:hover { background: #333; }

    /* MODAL */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(6px); z-index: 50; display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
    .modal { background: #fff; border-radius: 18px; padding: 28px; width: 100%; max-width: 460px; box-shadow: 0 25px 80px rgba(0,0,0,0.2); }
    .modal-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; }
    .modal-title { font-size: 17px; font-weight: 700; color: #1A1916; }
    .modal-sub { font-size: 13px; color: #8A8780; margin-top: 3px; }
    .modal-close { background: #F5F4F1; border: none; border-radius: 8px; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #8A8780; flex-shrink: 0; }
    .modal-close:hover { background: #ECEAE4; color: #1A1916; }
    .modal-field { margin-bottom: 16px; }
    .modal-field label { display: block; font-size: 13px; font-weight: 600; color: #4A4844; margin-bottom: 6px; }
    .modal-input { width: 100%; font-size: 14px; color: #1A1916; background: #F9F8F6; border: 1px solid #E5E3DC; border-radius: 9px; padding: 10px 13px; font-family: inherit; outline: none; transition: border-color 0.15s; }
    .modal-input:focus { border-color: #E10E1C; background: #fff; }
    .modal-textarea { width: 100%; font-size: 14px; color: #1A1916; background: #F9F8F6; border: 1px solid #E5E3DC; border-radius: 9px; padding: 10px 13px; font-family: inherit; outline: none; resize: vertical; min-height: 100px; transition: border-color 0.15s; }
    .modal-textarea:focus { border-color: #E10E1C; background: #fff; }
    .star-picker { display: flex; gap: 6px; }
    .star-btn { font-size: 26px; background: none; border: none; cursor: pointer; padding: 0; line-height: 1; color: #E5E3DC; transition: color 0.1s, transform 0.1s; }
    .star-btn.active { color: #F59E0B; }
    .star-btn:hover { transform: scale(1.2); }
    .modal-actions { display: flex; gap: 8px; margin-top: 4px; }
    .modal-error { font-size: 13px; color: #DC2626; background: #FEF2F2; border-radius: 8px; padding: 10px 13px; margin-bottom: 14px; }

    /* TRIAL BANNER */
    .trial-banner { background: #FFFBEB; border-bottom: 1px solid #FDE68A; padding: 10px 28px; display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 13.5px; color: #92400E; flex-wrap: wrap; }
    .trial-banner strong { font-weight: 700; }
    .trial-banner-btn { font-size: 13px; font-weight: 600; color: #fff; background: #D97706; border: none; border-radius: 8px; padding: 7px 14px; cursor: pointer; font-family: inherit; white-space: nowrap; flex-shrink: 0; }
    .trial-banner-btn:hover { background: #B45309; }

    /* LOCKED RATING GOAL */
    .rg-locked { background: #fff; border: 1px solid #E8E6E0; border-left: 3px solid #D1D5DB; border-radius: 14px; padding: 16px 20px; margin-bottom: 2rem; display: flex; align-items: center; gap: 14px; }
    .rg-locked-icon { width: 36px; height: 36px; border-radius: 10px; background: #F3F4F6; color: #9CA3AF; font-size: 18px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .rg-locked-label { font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #9E9B93; margin-bottom: 3px; }
    .rg-locked-body { font-size: 14px; color: #6B6963; }
    .rg-locked-btn { margin-left: auto; flex-shrink: 0; font-size: 13px; font-weight: 600; color: #fff; background: #1A1916; border: none; border-radius: 8px; padding: 8px 14px; cursor: pointer; font-family: inherit; white-space: nowrap; }
    .rg-locked-btn:hover { background: #2D2D2A; }

    @media (max-width: 768px) {
      .sidebar { transform: translateX(-100%); }
      .sidebar.open { transform: translateX(0); }
      .sidebar-backdrop.open { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 25; }
      .main { margin-left: 0; }
      .topbar, .content { padding-left: 16px; padding-right: 16px; }
      .nav-toggle { display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 8px; border: 1px solid #E0DED7; background: #fff; cursor: pointer; color: #1A1916; margin-right: 10px; flex-shrink: 0; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      .search-filter-row { flex-direction: column; align-items: stretch; }
      .search-wrap { max-width: 100%; }
      .filter-tabs { overflow-x: auto; }
      .trial-banner { padding: 10px 16px; }
    }
  `

  return (
    <>
      <style>{css}</style>
      <div className="layout">

        {/* SIDEBAR */}
        <div className={'sidebar-backdrop' + (mobileNavOpen ? ' open' : '')} onClick={() => setMobileNavOpen(false)} />
        <aside className={'sidebar' + (mobileNavOpen ? ' open' : '')}>
          <div className="sidebar-logo">
            <div className="logo-mark">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/revio-icon.png" alt="" />
            </div>
            <span className="logo-name">Revio</span>
          </div>
          <nav className="sidebar-nav">
            <span className="nav-section">Manage</span>
            <button className="nav-item active">
              <LayoutDashboard size={15} />
              Dashboard
              {needsActionCount > 0 && <span className="nav-badge">{needsActionCount}</span>}
            </button>
            <button className="nav-item" onClick={() => { setMobileNavOpen(false); router.push('/analytics') }}>
              <BarChart2 size={15} />
              Analytics
            </button>
            <button className="nav-item" onClick={() => { setMobileNavOpen(false); router.push('/billing') }}>
              <CreditCard size={15} />
              Billing
            </button>
            <button className="nav-item" onClick={() => { setMobileNavOpen(false); router.push('/settings') }}>
              <Settings size={15} />
              Settings
            </button>
          </nav>
          <div className="sidebar-bottom">
            <button className="nav-signout" onClick={() => api.post('/auth/logout').finally(() => router.push('/login'))}>
              <LogOut size={15} />
              Sign out
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <div className="main">
          <div className="topbar">
            <div className="topbar-left">
              <button className="nav-toggle" onClick={() => setMobileNavOpen(true)} aria-label="Open menu">
                <Menu size={18} />
              </button>
              <span className="topbar-title">Reviews</span>
            </div>
            <div className="topbar-actions">
              <button className="btn-ghost" onClick={() => fetchReviews(true)}>
                <RefreshCw size={13} className={refreshing ? 'spin' : ''} />
                Refresh
              </button>
              <button className="btn-primary" onClick={() => setShowImport(true)}>
                <Plus size={14} />
                Add review
              </button>
            </div>
          </div>

          {billingInfo?.is_trial && !billingInfo?.is_subscribed && (
            <div className="trial-banner">
              <span>
                <strong>Free trial</strong> — {billingInfo.trial_days_remaining === 0 ? 'last day' : `${billingInfo.trial_days_remaining} day${billingInfo.trial_days_remaining === 1 ? '' : 's'} remaining`}.
                {' '}Subscribe to keep full access and unlock the Rating Goal Tracker.
              </span>
              <button className="trial-banner-btn" onClick={() => router.push('/billing')}>Subscribe now</button>
            </div>
          )}

          <div className="content">
            {locked ? (
              <div className="paywall">
                <h2>Upgrade to Pro</h2>
                <p>Subscribe to unlock review management, AI-generated replies, and your live rating goal tracker.</p>
                <button className="paywall-btn" onClick={() => router.push('/billing')}>View plans</button>
              </div>
            ) : (
              <>
                {/* LOCATION PICKER */}
                {showLocationPicker && (
                  <div className="location-bar">
                    <div className="location-bar-text">
                      <div className="location-bar-title">Select your business location</div>
                      <div className="location-bar-sub">Choose the one location Revio will manage.</div>
                    </div>
                    {locationSaved ? (
                      <span className="loc-saved">✓ Location saved</span>
                    ) : accountsError ? (
                      <div style={{ fontSize: 13, color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 14px', maxWidth: 360 }}>
                        {accountsError}
                      </div>
                    ) : (
                      <div className="location-selects">
                        <select className="loc-select" value={selectedAccount} onChange={e => handleAccountChange(e.target.value)}>
                          <option value="">Select account…</option>
                          {accounts.map((a: any) => <option key={a.name} value={a.name}>{a.accountName || a.name}</option>)}
                        </select>
                        <select className="loc-select" value={selectedLocation} onChange={e => setSelectedLocation(e.target.value)} disabled={!locations.length}>
                          <option value="">{loadingLocations ? 'Loading…' : 'Select location…'}</option>
                          {locations.map((l: any) => <option key={l.name} value={l.name}>{l.title || l.name}</option>)}
                        </select>
                        <button className="btn-save-loc" onClick={handleSaveLocation} disabled={!selectedAccount || !selectedLocation || savingLocation}>
                          {savingLocation ? 'Saving…' : 'Confirm'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* STATS */}
                <div className="stats-grid">
                  <div className="metric-card">
                    <div className="metric-icon mi-gray"><Star size={16} /></div>
                    <div className="metric-label">Total reviews</div>
                    <div className="metric-value">{reviews.length}</div>
                    {thisWeek > 0
                      ? <div className="metric-sub-up">↑ {thisWeek} this week</div>
                      : <div className="metric-sub">all time</div>}
                  </div>
                  <div className="metric-card">
                    <div className="metric-icon mi-amber"><Star size={16} /></div>
                    <div className="metric-label">Avg rating</div>
                    <div className="metric-value">{avgRating || '—'}</div>
                    <div className="metric-sub">out of 5.0</div>
                  </div>
                  <div className={`metric-card${needsActionCount > 0 ? ' metric-alert' : ''}`}>
                    <div className={`metric-icon${needsActionCount > 0 ? ' mi-red' : ' mi-gray'}`}>
                      {needsActionCount > 0 ? <AlertTriangle size={16} /> : <Clock size={16} />}
                    </div>
                    <div className="metric-label">Needs action</div>
                    <div className="metric-value">{needsActionCount}</div>
                    <div className="metric-sub">{needsActionCount > 0 ? 'pending or flagged' : 'all clear'}</div>
                  </div>
                  <div className="metric-card">
                    <div className="metric-icon mi-blue"><TrendingUp size={16} /></div>
                    <div className="metric-label">Response rate</div>
                    <div className="metric-value">{reviews.length ? `${responseRate}%` : '—'}</div>
                    <div className="metric-sub">replied or scheduled</div>
                  </div>
                </div>

                {/* RATING GOAL */}
                {billingInfo?.is_subscribed ? (
                  <RatingGoal rating={avgRating} count={reviews.length} />
                ) : (
                  <div className="rg-locked">
                    <div className="rg-locked-icon">★</div>
                    <div>
                      <div className="rg-locked-label">Rating Goal Tracker</div>
                      <div className="rg-locked-body">See exactly how many 5★ reviews you need to reach your next milestone.</div>
                    </div>
                    <button className="rg-locked-btn" onClick={() => router.push('/billing')}>Subscribe to unlock →</button>
                  </div>
                )}

                {/* SEARCH + FILTER */}
                <div className="search-filter-row">
                  <div className="search-wrap">
                    <Search size={14} className="search-icon-abs" />
                    <input
                      className="search-input"
                      type="text"
                      placeholder="Search by name or review…"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="filter-tabs">
                    {FILTERS.map(f => (
                      <button key={f} className={`filter-tab${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
                        {FILTER_LABELS[f]}
                        {f === 'needs-action' && needsActionCount > 0 && (
                          <span className="filter-tab-badge">{needsActionCount}</span>
                        )}
                        {f === 'scheduled' && scheduledCount > 0 && (
                          <span className="filter-tab-badge">{scheduledCount}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* RESULT COUNT */}
                {searchQuery && !loading && (
                  <div className="results-count">
                    {filtered.length === 0 ? 'No reviews match your search' : `${filtered.length} review${filtered.length !== 1 ? 's' : ''} found`}
                  </div>
                )}

                {/* REVIEWS */}
                {loading && <div className="loading-spinner" />}
                {!loading && filtered.length === 0 && (
                  <div className="empty-state">
                    <h3>{searchQuery ? 'No results' : filter === 'all' ? 'No reviews yet' : `No ${FILTER_LABELS[filter].toLowerCase()} reviews`}</h3>
                    <p>
                      {searchQuery
                        ? `No reviews match "${searchQuery}". Try a different search term.`
                        : filter === 'all'
                        ? 'Connect your Google Business Profile or add a review manually to get started.'
                        : `You have no reviews in this category right now.`}
                    </p>
                    {filter === 'all' && !searchQuery && (
                      <button className="empty-state-btn" onClick={handleGoogleConnect}>
                        Connect Google Business →
                      </button>
                    )}
                  </div>
                )}
                {!loading && filtered.length > 0 && (
                  <>
                    <div className="reviews-list">
                      {displayed.map((review: Review) => {
                        const av = avatarColor(review.reviewer_name)
                        const isEditing = editing[review.id] !== undefined
                        const replyText = isEditing ? editing[review.id] : review.generated_reply
                        const statusPill = STATUS_PILL[review.status]

                        return (
                          <div key={review.id} className="review-card">
                            <div className="review-risk-bar" style={{ background: RISK_BORDER[review.risk_level] || '#E5E3DC' }} />
                            <div className="review-body">
                              <div className="review-header">
                                <div className="reviewer-info">
                                  <div className="avatar" style={{ background: av.bg, color: av.color }}>
                                    {initials(review.reviewer_name)}
                                  </div>
                                  <div>
                                    <div className="reviewer-name">{review.reviewer_name}</div>
                                    <div className="reviewer-meta">
                                      <span className="stars-row">
                                        {[1,2,3,4,5].map(n => (
                                          <Star key={n} size={11} fill={n <= review.rating ? '#F59E0B' : 'none'} className={n <= review.rating ? 'star-filled' : 'star-empty'} />
                                        ))}
                                      </span>
                                      <span className="review-meta-sep">·</span>
                                      <span>{review.created_at ? timeAgo(review.created_at) : ''}</span>
                                      <span className="review-meta-sep">·</span>
                                      <span>Google</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="review-badges">
                                  {statusPill && (
                                    <span className="pill" style={{ background: statusPill.bg, color: statusPill.color }}>
                                      {statusPill.label}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <p className="review-text">{review.review_text}</p>

                              {/* PROCESSING STATE */}
                              {review.status === 'processing' && (
                                <div className="processing-notice">
                                  <div className="processing-dots">
                                    <div className="processing-dot" />
                                    <div className="processing-dot" />
                                    <div className="processing-dot" />
                                  </div>
                                  Generating AI reply…
                                </div>
                              )}

                              {review.status === 'scheduled' && review.reply_at && (
                                <div className="scheduled-notice">
                                  <span><Clock size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />Auto-replying in {timeUntil(review.reply_at)} — will post to Google automatically</span>
                                  <button className="btn-cancel-schedule" onClick={() => handleCancelSchedule(review.id)}>Cancel</button>
                                </div>
                              )}

                              {review.status === 'flagged' && (
                                <div className="flagged-notice">
                                  <AlertTriangle size={15} />
                                  High risk — review the draft carefully and edit before posting. You have also been emailed.
                                </div>
                              )}

                              {replyText && review.status !== 'processing' ? (
                                <div className="reply-section">
                                  <div className="reply-header">
                                    <span className="reply-tag">AI Draft</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                      {(review.status === 'pending' || review.status === 'scheduled' || review.status === 'flagged') && (
                                        <button className="reply-edit-btn" onClick={() => isEditing
                                          ? setEditing(e => { const n = { ...e }; delete n[review.id]; return n })
                                          : setEditing(e => ({ ...e, [review.id]: review.generated_reply }))
                                        }>{isEditing ? 'Cancel edit' : 'Edit'}</button>
                                      )}
                                      <button
                                        className="reply-regen-btn"
                                        disabled={regenerating === review.id}
                                        onClick={() => handleRegenerate(review.id)}
                                      >
                                        <RefreshCw size={11} className={regenerating === review.id ? 'spin' : ''} />
                                        {regenerating === review.id ? 'Regenerating…' : 'Regenerate'}
                                      </button>
                                    </div>
                                  </div>
                                  {isEditing
                                    ? <textarea className="reply-textarea" value={editing[review.id]} onChange={e => setEditing(ed => ({ ...ed, [review.id]: e.target.value }))} />
                                    : <p className="reply-text">{replyText}</p>
                                  }
                                </div>
                              ) : null}

                              {(review.status === 'pending' || review.status === 'flagged') && (
                                <div className="review-actions">
                                  <button className="btn-approve" disabled={approving === review.id} onClick={() => handleApprove(review.id)}>
                                    {approving === review.id ? 'Posting…' : 'Approve & post'}
                                  </button>
                                  {!isEditing && (
                                    <button className="btn-edit-reply" onClick={() => setEditing(e => ({ ...e, [review.id]: review.generated_reply }))}>Edit reply</button>
                                  )}
                                  <button className="btn-reject" onClick={() => handleReject(review.id)}>Reject</button>
                                </div>
                              )}
                              {review.status === 'scheduled' && isEditing && (
                                <div className="review-actions">
                                  <button className="btn-approve" disabled={approving === review.id} onClick={() => handleApprove(review.id)}>
                                    {approving === review.id ? 'Posting…' : 'Post now instead'}
                                  </button>
                                  <button className="btn-edit-reply" onClick={() => setEditing(e => { const n = { ...e }; delete n[review.id]; return n })}>Cancel edit</button>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* LOAD MORE */}
                    {displayCount < filtered.length && (
                      <div className="load-more-row">
                        <button className="btn-load-more" onClick={() => setDisplayCount(c => c + PAGE_SIZE)}>
                          Load more · {filtered.length - displayCount} remaining
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* IMPORT MODAL */}
      {showImport && (
        <div className="modal-overlay" onClick={() => setShowImport(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-title">Add review manually</div>
                <div className="modal-sub">Paste in a review to generate an AI reply draft.</div>
              </div>
              <button className="modal-close" onClick={() => setShowImport(false)}><X size={14} /></button>
            </div>
            <form onSubmit={handleImport}>
              {importError && <div className="modal-error">{importError}</div>}
              <div className="modal-field">
                <label>Reviewer name</label>
                <input className="modal-input" type="text" value={importName} onChange={e => setImportName(e.target.value)} required placeholder="e.g. Sarah M." />
              </div>
              <div className="modal-field">
                <label>Rating</label>
                <div className="star-picker">
                  {[1,2,3,4,5].map(n => (
                    <button key={n} type="button" className={`star-btn${n <= importRating ? ' active' : ''}`} onClick={() => setImportRating(n)}>★</button>
                  ))}
                </div>
              </div>
              <div className="modal-field">
                <label>Review text</label>
                <textarea className="modal-textarea" value={importText} onChange={e => setImportText(e.target.value)} required placeholder="Paste the review here…" />
              </div>
              <div className="modal-actions">
                <button className="btn-approve" type="submit" disabled={importLoading}>
                  {importLoading ? 'Processing…' : 'Import & generate reply'}
                </button>
                <button className="btn-edit-reply" type="button" onClick={() => setShowImport(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
