'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

export default function SettingsPage() {
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const [disconnected, setDisconnected] = useState(false)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) { setPwError('New password must be at least 8 characters'); return }
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

  const css = `
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    .shell { min-height: 100vh; background: #F7F6F3; font-family: system-ui, -apple-system, sans-serif; color: #1A1916; }
    .nav { background: #fff; border-bottom: 1px solid #ECEAE4; padding: 0 2rem; height: 56px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 10; }
    .nav-logo { font-size: 17px; font-weight: 600; color: #1A1916; display: flex; align-items: center; gap: 8px; cursor: pointer; }
    .nav-dot { width: 8px; height: 8px; border-radius: 50%; background: #E10E1C; }
    .nav-back { font-size: 13px; color: #888; border: none; background: none; cursor: pointer; padding: 6px 10px; border-radius: 6px; }
    .nav-back:hover { background: #F7F6F3; color: #444; }
    .page { max-width: 560px; margin: 0 auto; padding: 2.5rem 1.5rem; }
    .page-title { font-size: 22px; font-weight: 600; margin-bottom: 2rem; }
    .card { background: #fff; border: 1px solid #ECEAE4; border-radius: 14px; padding: 24px; margin-bottom: 1.25rem; }
    .card-title { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
    .card-sub { font-size: 13px; color: #9E9B93; margin-bottom: 20px; }
    .field { margin-bottom: 14px; }
    .field label { display: block; font-size: 13px; font-weight: 500; color: #5F5E5A; margin-bottom: 6px; }
    .field input, .field textarea { width: 100%; font-size: 14px; color: #1A1916; background: #FAF9F6; border: 1px solid #ECEAE4; border-radius: 8px; padding: 10px 12px; font-family: inherit; outline: none; transition: border-color 0.15s; resize: vertical; }
    .field input:focus, .field textarea:focus { border-color: #E10E1C; background: #fff; }
    .field textarea { min-height: 90px; }
    .field-hint { font-size: 12px; color: #9E9B93; margin-top: 6px; line-height: 1.5; }
    .btn { font-size: 13px; font-weight: 500; padding: 9px 20px; border-radius: 8px; cursor: pointer; border: 1px solid transparent; font-family: inherit; }
    .btn-primary { background: #1A1916; color: #fff; border-color: #1A1916; }
    .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-danger { background: #fff; color: #A32D2D; border-color: #F7C1C1; }
    .btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }
    .success { font-size: 13px; color: #3B6D11; background: #EAF3DE; border-radius: 8px; padding: 10px 14px; margin-top: 14px; }
    .error { font-size: 13px; color: #A32D2D; background: #FCEBEB; border-radius: 8px; padding: 10px 14px; margin-top: 14px; }
    .connected-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; color: #3B6D11; background: #EAF3DE; border-radius: 99px; padding: 4px 12px; margin-bottom: 16px; }
    .disconnected-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; color: #888; background: #F1EFE8; border-radius: 99px; padding: 4px 12px; margin-bottom: 16px; }
    .divider { border: none; border-top: 1px solid #ECEAE4; margin: 20px 0; }
    .danger-title { font-size: 15px; font-weight: 600; color: #A32D2D; margin-bottom: 4px; }
    .danger-sub { font-size: 13px; color: #9E9B93; margin-bottom: 16px; }
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
          <button className="nav-back" onClick={() => router.push('/dashboard')}>← Dashboard</button>
        </nav>

        <div className="page">
          <div className="page-title">Settings</div>

          <div className="card">
            <div className="card-title">Change password</div>
            <div className="card-sub">Use a strong password of at least 8 characters.</div>
            <form onSubmit={handleChangePassword}>
              <div className="field">
                <label>Current password</label>
                <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
              </div>
              <div className="field">
                <label>New password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
              </div>
              <button className="btn btn-primary" type="submit" disabled={pwLoading}>
                {pwLoading ? 'Updating…' : 'Update password'}
              </button>
              {pwSuccess && <div className="success">{pwSuccess}</div>}
              {pwError && <div className="error">{pwError}</div>}
            </form>
          </div>

          <div className="card">
            <div className="card-title">Google Business Profile</div>
            <div className="card-sub">Manage your connected Google account.</div>
            {disconnected
              ? <div className="disconnected-badge">● Disconnected</div>
              : <div className="connected-badge">● Connected</div>
            }
            {!disconnected && (
              <button className="btn btn-danger" onClick={handleDisconnectGoogle} disabled={disconnecting}>
                {disconnecting ? 'Disconnecting…' : 'Disconnect Google'}
              </button>
            )}
            {disconnected && (
              <button className="btn btn-primary" onClick={() => router.push('/dashboard')}>
                Reconnect from dashboard
              </button>
            )}
          </div>

          <div className="card">
            <div className="card-title">Billing</div>
            <div className="card-sub">Manage your subscription and payment details.</div>
            <button className="btn btn-primary" onClick={() => router.push('/billing')}>Go to billing →</button>
          </div>

          <div className="card">
            <div className="danger-title">Legal</div>
            <div className="danger-sub">Read our terms and privacy policy.</div>
            <a href="/legal" style={{fontSize:'13px',color:'#E10E1C',textDecoration:'underline'}}>Terms of Service &amp; Privacy Policy →</a>
          </div>
        </div>
      </div>
    </>
  )
}
