import { useState, useEffect } from 'react'
import { adminAPI } from '../utils/api'
import AdminSidebar from '../components/AdminSidebar'
import './Admin.css'

const STATUS_BADGE = {
  pending: 'badge-warning', confirmed: 'badge-neutral',
  shipped: 'badge-gold', delivered: 'badge-success', cancelled: 'badge-error',
}

export default function AdminDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminAPI.dashboard()
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', width: '100%' }}>
      <AdminSidebar />
      <div className="admin-content page-loader"><div className="spinner" /></div>
    </div>
  )

  const { stats, recentOrders, monthlyRevenue, topProducts } = data

  const maxRevenue = Math.max(...(monthlyRevenue?.map(m => parseFloat(m.revenue)) || [1]))

  return (
    <div style={{ display: 'flex', width: '100%' }}>
      <AdminSidebar />
      <div className="admin-content page-enter">
        <div className="admin-page-header">
          <h1 className="admin-page-title">Dashboard</h1>
          <span className="admin-date">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>

        {/* Stats */}
        <div className="stats-grid">
          {[
            { label: 'Total Revenue', value: `$${stats.revenue.toLocaleString('en', { minimumFractionDigits: 2 })}`, icon: '💰', color: '#c9a84c' },
            { label: 'Total Orders', value: stats.orders.toLocaleString(), icon: '📦', color: '#3498db' },
            { label: 'Customers', value: stats.users.toLocaleString(), icon: '👤', color: '#2ecc71' },
            { label: 'Products', value: stats.products.toLocaleString(), icon: '🏷️', color: '#9b59b6' },
          ].map(s => (
            <div key={s.label} className="stat-card card">
              <div className="stat-icon" style={{ background: `${s.color}18`, color: s.color }}>{s.icon}</div>
              <div>
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="admin-grid-2">
          {/* Revenue chart */}
          <div className="card admin-chart-card">
            <h2 className="admin-card-title">Monthly Revenue</h2>
            {monthlyRevenue?.length > 0 ? (
              <div className="bar-chart">
                {monthlyRevenue.map((m, i) => {
                  const pct = (parseFloat(m.revenue) / maxRevenue) * 100
                  const month = new Date(m.month).toLocaleDateString('en', { month: 'short' })
                  return (
                    <div key={i} className="bar-col">
                      <div className="bar-value">${Math.round(parseFloat(m.revenue))}</div>
                      <div className="bar-wrap">
                        <div className="bar-fill" style={{ height: `${pct}%` }} />
                      </div>
                      <div className="bar-label">{month}</div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--ink-muted)' }}>No revenue data yet</div>
            )}
          </div>

          {/* Top Products */}
          <div className="card admin-chart-card">
            <h2 className="admin-card-title">Top Products</h2>
            {topProducts?.length > 0 ? (
              <div className="top-products-list">
                {topProducts.map((p, i) => (
                  <div key={i} className="top-product-row">
                    <div className="top-product-rank">{i + 1}</div>
                    <div className="top-product-info">
                      <div className="top-product-name">{p.name}</div>
                      <div className="top-product-meta">{p.sold} sold · ${parseFloat(p.revenue).toFixed(2)} revenue</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--ink-muted)' }}>No sales yet</div>
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="card" style={{ marginTop: '1.5rem' }}>
          <div className="admin-card-header">
            <h2 className="admin-card-title">Recent Orders</h2>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders?.length > 0 ? recentOrders.map(order => (
                  <tr key={order.id}>
                    <td><code>#{order.id.slice(0, 8).toUpperCase()}</code></td>
                    <td>{order.user_name || 'Guest'}</td>
                    <td>{new Date(order.created_at).toLocaleDateString()}</td>
                    <td><strong>${parseFloat(order.total).toFixed(2)}</strong></td>
                    <td><span className={`badge ${STATUS_BADGE[order.status]}`}>{order.status}</span></td>
                  </tr>
                )) : (
                  <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--ink-muted)', padding: '2rem' }}>No orders yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
