import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { authAPI } from '../utils/api'
import { Link } from 'react-router-dom'
import './Profile.css'

export default function Profile() {
  const { user, login } = useAuth()
  const { addToast } = useToast()
  const [form, setForm] = useState({ name: user?.name || '', avatar: user?.avatar || '' })
  const [saving, setSaving] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await authAPI.updateProfile(form)
      addToast('Profile updated!', 'success')
    } catch {
      addToast('Could not update profile', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="profile-page page-enter">
      <div className="container">
        <h1 className="profile-title">My Profile</h1>

        <div className="profile-layout">
          {/* Sidebar */}
          <div className="profile-sidebar">
            <div className="profile-avatar-section">
              <div className="profile-avatar-big">{user?.name?.[0]?.toUpperCase()}</div>
              <div className="profile-name">{user?.name}</div>
              <div className="profile-email">{user?.email}</div>
              <span className={`badge ${user?.role === 'admin' ? 'badge-gold' : 'badge-neutral'}`}>
                {user?.role}
              </span>
            </div>
            <nav className="profile-nav">
              <Link to="/profile" className="profile-nav-link active">Account Details</Link>
              <Link to="/orders" className="profile-nav-link">Order History</Link>
              {user?.role === 'admin' && <Link to="/admin" className="profile-nav-link">Admin Dashboard</Link>}
            </nav>
          </div>

          {/* Main */}
          <div className="profile-main">
            <div className="card profile-card">
              <h2 className="profile-section-title">Account Details</h2>
              <form onSubmit={handleSave} className="profile-form">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    className="form-input"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Your full name"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input className="form-input" value={user?.email} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                  <span style={{ fontSize: '0.78rem', color: 'var(--ink-muted)' }}>Email cannot be changed</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Avatar URL (optional)</label>
                  <input
                    className="form-input"
                    value={form.avatar}
                    onChange={e => setForm(f => ({ ...f, avatar: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Account Role</label>
                  <input className="form-input" value={user?.role} disabled style={{ opacity: 0.6, cursor: 'not-allowed', textTransform: 'capitalize' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Member Since</label>
                  <input className="form-input" value={new Date(user?.created_at || Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
                </div>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
