'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LayoutDashboard, CreditCard, Settings, RefreshCw, LogOut, Menu } from 'lucide-react'
import api from '@/lib/api'

export default function SettingsPage() {
  const router = useRouter()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [disconnected, setDisconnected] = useState(false)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwLoading(true)
    setPwError('')
    setPwSuccess('')
    try {
      await api.post('/auth/change-password', { current_password: currentPassword, new_password: newPassword })
      setPwSuccess('Password updated successfully.')
      setCurrentPassword('')
      setNewPassword('')
    } catch (err: any) {
      setPwError(err.response?.data?.detail || 'Failed to update password.')
    } finally {
      setPwLoading(false)
    }
  }

  const handleDisconnectGoogle = async () => {
    if (!confirm('Disconnect your Google Business Profile? Review syncing will stop.')) return
    setDisconnecting(true)
    try {
      await api.post('/google/disconnect')
      setDisconnected(true)
    } catch {
      alert('Failed to disconnect. Please try again.')
    } finally {
      setDisconnecting(false)
    }
  }

  const handleGoogleConnect = async () => {
    try {
      const res = await api.get('/google/connect')
      window.location.href = res.data.auth_url
    } catch { alert('Failed to start Google connection.') }
  }

  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { height: 100%; }
    .st-layout { display: flex; min-height: 100vh; background: #F5F4F1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111110; }

    /* SIDEBAR */
    .st-sidebar { width: 228px; background: #0F0F0E; display: flex; flex-direction: column; position: fixed; top: 0; left: 0; height: 100vh; z-index: 30; border-right: 1px solid rgba(255,255,255,0.06); transition: transform 0.2s ease; }
    .st-backdrop { display: none; }
    .st-nav-toggle { display: none; }
    .st-sidebar-logo { padding: 22px 20px 20px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid rgba(255,255,255,0.06); margin-bottom: 8px; }
    .st-logo-mark { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .st-logo-mark img { width: 28px; height: 28px; object-fit: contain; }
    .st-logo-name { font-size: 15px; font-weight: 700; color: #fff; letter-spacing: -0.01em; }
    .st-nav { flex: 1; padding: 4px 10px; display: flex; flex-direction: column; gap: 2px; }
    .st-nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; font-size: 13.5px; font-weight: 500; color: rgba(255,255,255,0.45); cursor: pointer; border: none; background: none; font-family: inherit; text-decoration: none; transition: background 0.15s, color 0.15s; width: 100%; text-align: left; }
    .st-nav-item:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.8); }
    .st-nav-item.active { background: rgba(255,255,255,0.1); color: #fff; font-weight: 600; }
    .st-nav-item.active svg { color: rgba(255,255,255,0.9); }
    .st-nav-item svg { flex-shrink: 0; }
    .st-nav-section { font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(255,255,255,0.22); padding: 16px 12px 6px; }
    .st-sidebar-bottom { padding: 10px; border-top: 1px solid rgba(255,255,255,0.06); }
    .st-signout { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 8px; font-size: 13.5px; font-weight: 500; color: rgba(255,255,255,0.35); cursor: pointer; border: none; background: none; font-family: inherit; width: 100%; transition: color 0.15s; }
    .st-signout:hover { color: rgba(255,255,255,0.6); }

    /* MAIN */
    .st-main { margin-left: 228px; flex: 1; display: flex; flex-direction: column; min-height: 100vh; }
    .st-topbar { background: #F5F4F1; border-bottom: 1px solid #E5E3DC; padding: 0 28px; height: 58px; display: flex; align-items: center; gap: 12px; position: sticky; top: 0; z-index: 10; }
    .st-topbar-title { font-size: 16px; font-weight: 700; color: #1A1916; letter-spacing: -0.01em; }
    .st-content { padding: 28px; max-width: 640px; }

    /* CARDS */
    .st-card { background: #fff; border: 1px solid #E8E6E0; border-radius: 16px; padding: 24px 26px; margin-bottom: 16px; }
    .st-card-title { font-size: 15px; font-weight: 700; color: #1A1916; margin-bottom: 4px; letter-spacing: -0.01em; }
    .st-card-sub { font-size: 13px; color: #9E9B93; margin-bottom: 20px; line-height: 1.55; }
    .st-field { margin-bottom: 16px; }
    .st-field label { display: block; font-size: 13px; font-weight: 600; color: #4A4844; margin-bottom: 7px; }
    .st-input { width: 100%; font-size: 14px; color: #1A1916; background: #FAFAF8; border: 1.5px solid #E5E3DC; border-radius: 10px; padding: 10px 13px; font-family: inherit; outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
    .st-input:focus { border-color: #111110; box-shadow: 0 0 0 3px rgba(17,17,16,0.06); background: #fff; }
    .st-divider { border: none; border-top: 1px solid #F0EFE8; margin: 20px 0; }
    .st-btn { font-size: 13px; font-weight: 600; padding: 9px 20px; border-radius: 9px; cursor: pointer; border: 1.5px solid transparent; font-family: inherit; transition: all 0.15s; }
    .st-btn-primary { background: #1A1916; color: #fff; border-color: #1A1916; }
    .st-btn-primary:hover { background: #2D2D2A; }
    .st-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .st-btn-danger { background: #fff; color: #B91C1C; border-color: #FECACA; }
    .st-btn-danger:hover { background: #FEF2F2; }
    .st-btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
    .st-success { font-size: 13px; font-weight: 500; color: #166534; background: #DCFCE7; border: 1px solid #BBF7D0; border-radius: 9px; padding: 11px 14px; margin-top: 16px; }
    .st-error { font-size: 13px; font-weight: 500; color: #B91C1C; background: #FEF2F2; border: 1px solid #FECACA; border-radius: 9px; padding: 11px 14px; margin-top: 16px; }
    .st-badge { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 600; padding: 5px 12px; border-radius: 99px; margin-bottom: 16px; }
    .st-badge-connected { background: #DCFCE7; color: #166534; }
    .st-badge-disconnected { background: #F1EFE8; color: #6B6963; }
    .st-badge-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
    .st-card-link { font-size: 13px; color: #E10E1C; font-weight: 600; text-decoration: none; }
    .st-card-link:hover { text-decoration: underline; }

    @media (max-width: 768px) {
      .st-sidebar { transform: translateX(-100%); }
      .st-sidebar.open { transform: translateX(0); }
      .st-backdrop.open { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 25; }
      .st-main { margin-left: 0; }
      .st-topbar { padding: 0 16px; }
      .st-content { padding: 16px; }
      .st-nav-toggle { display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 8px; border: 1px solid #E0DED7; background: #fff; cursor: pointer; color: #1A1916; flex-shrink: 0; }
    }
  `

  return (
    <>
      <style>{css}</style>
      <div className="st-layout">

        {/* SIDEBAR */}
        <div className={'st-backdrop' + (mobileNavOpen ? ' open' : '')} onClick={() => setMobileNavOpen(false)} />
        <aside className={'st-sidebar' + (mobileNavOpen ? ' open' : '')}>
          <div className="st-sidebar-logo">
            <div className="st-logo-mark">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/revio-icon.png" alt="" />
            </div>
            <span className="st-logo-name">Revio</span>
          </div>
          <nav className="st-nav">
            <span className="st-nav-section">Manage</span>
            <button className="st-nav-item" onClick={() => { setMobileNavOpen(false); router.push('/dashboard') }}>
              <LayoutDashboard size={15} />
              Dashboard
            </button>
            <button className="st-nav-item" onClick={() => { setMobileNavOpen(false); router.push('/billing') }}>
              <CreditCard size={15} />
              Billing
            </button>
            <button className="st-nav-item active">
              <Settings size={15} />
              Settings
            </button>
            <span className="st-nav-section">Google</span>
            <button className="st-nav-item" onClick={() => { setMobileNavOpen(false); handleGoogleConnect() }}>
              <RefreshCw size={15} />
              Connect Google
            </button>
          </nav>
          <div className="st-sidebar-bottom">
            <button className="st-signout" onClick={() => api.post('/auth/logout').finally(() => router.push('/login'))}>
              <LogOut size={15} />
              Sign out
            </button>
          </div>
        </aside>

        {/* MAIN */}
        <div className="st-main">
          <div className="st-topbar">
            <button className="st-nav-toggle" onClick={() => setMobileNavOpen(true)} aria-label="Open menu">
              <Menu size={18} />
            </button>
            <span className="st-topbar-title">Settings</span>
          </div>

          <div className="st-content">

            <div className="st-card">
              <div className="st-card-title">Change password</div>
              <div className="st-card-sub">Must be 8+ characters with uppercase, lowercase, a number, and a special character.</div>
              <form onSubmit={handleChangePassword}>
                <div className="st-field">
                  <label>Current password</label>
                  <input className="st-input" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
                </div>
                <div className="st-field">
                  <label>New password</label>
                  <input className="st-input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                </div>
                <button className="st-btn st-btn-primary" type="submit" disabled={pwLoading}>
                  {pwLoading ? 'Updating…' : 'Update password'}
                </button>
                {pwSuccess && <div className="st-success">{pwSuccess}</div>}
                {pwError && <div className="st-error">{pwError}</div>}
              </form>
            </div>

            <div className="st-card">
              <div className="st-card-title">Google Business Profile</div>
              <div className="st-card-sub">Manage your connected Google account. Disconnecting will stop review syncing.</div>
              {disconnected ? (
                <div className="st-badge st-badge-disconnected">
                  <span className="st-badge-dot" /> Disconnected
                </div>
              ) : (
                <div className="st-badge st-badge-connected">
                  <span className="st-badge-dot" /> Connected
                </div>
              )}
              <div className="st-divider" />
              {!disconnected ? (
                <button className="st-btn st-btn-danger" onClick={handleDisconnectGoogle} disabled={disconnecting}>
                  {disconnecting ? 'Disconnecting…' : 'Disconnect Google'}
                </button>
              ) : (
                <button className="st-btn st-btn-primary" onClick={() => router.push('/dashboard')}>
                  Reconnect from dashboard
                </button>
              )}
            </div>

            <div className="st-card">
              <div className="st-card-title">Billing &amp; subscription</div>
              <div className="st-card-sub">Manage your Revio Pro subscription and payment method.</div>
              <button className="st-btn st-btn-primary" onClick={() => router.push('/billing')}>
                Go to billing →
              </button>
            </div>

            <div className="st-card">
              <div className="st-card-title">Legal</div>
              <div className="st-card-sub">Review our terms of service and privacy policy.</div>
              <a className="st-card-link" href="/legal">Terms of Service &amp; Privacy Policy →</a>
            </div>

          </div>
        </div>

      </div>
    </>
  )
}
