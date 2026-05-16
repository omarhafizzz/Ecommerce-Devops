import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './AdminSidebar.css'

const NAV = [
  { path: '/admin', label: 'Dashboard', icon: '◈' },
  { path: '/admin/products', label: 'Products', icon: '⬡' },
  { path: '/admin/orders', label: 'Orders', icon: '◎' },
  { path: '/', label: 'View Store', icon: '↗' },
]

export default function AdminSidebar() {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()

  return (
    <aside className="admin-sidebar">
      <div className="admin-brand">
        <span className="admin-logo">✦ LUXE</span>
        <span className="admin-tag">Admin</span>
      </div>
      <nav className="admin-nav">
        {NAV.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`admin-nav-link ${pathname === item.path ? 'active' : ''}`}
          >
            <span className="admin-nav-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="admin-user">
        <div className="admin-avatar">{user?.name?.[0]?.toUpperCase()}</div>
        <div>
          <div className="admin-user-name">{user?.name}</div>
          <div className="admin-user-role">Administrator</div>
        </div>
        <button className="admin-logout" onClick={logout} title="Sign out">⏻</button>
      </div>
    </aside>
  )
}
