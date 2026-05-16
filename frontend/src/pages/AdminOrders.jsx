import { useState, useEffect } from 'react'
import { adminAPI } from '../utils/api'
import { useToast } from '../context/ToastContext'
import AdminSidebar from '../components/AdminSidebar'
import './Admin.css'

const STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']
const STATUS_BADGE = {
  pending: 'badge-warning', confirmed: 'badge-neutral',
  shipped: 'badge-gold', delivered: 'badge-success', cancelled: 'badge-error',
}

export default function AdminOrders() {
  const { addToast } = useToast()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [expanded, setExpanded] = useState(null)

  const load = () => adminAPI.orders(filter ? { status: filter } : {})
    .then(r => setOrders(r.data))
    .finally(() => setLoading(false))

  useEffect(() => { setLoading(true); load() }, [filter])

  const updateStatus = async (id, status) => {
    try {
      await adminAPI.updateOrderStatus(id, status)
      addToast('Status updated!', 'success')
      load()
    } catch {
      addToast('Could not update status', 'error')
    }
  }

  return (
    <div style={{ display: 'flex', width: '100%' }}>
      <AdminSidebar />
      <div className="admin-content page-enter">
        <div className="admin-page-header">
          <h1 className="admin-page-title">Orders</h1>
        </div>

        <div className="admin-toolbar card">
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button className={`filter-chip ${!filter ? 'active' : ''}`} onClick={() => setFilter('')}>All</button>
            {STATUSES.map(s => (
              <button key={s} className={`filter-chip ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <span className="admin-count">{orders.length} orders</span>
        </div>

        <div className="card" style={{ marginTop: '1rem' }}>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Update</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" /></td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--ink-muted)' }}>No orders found</td></tr>
                ) : orders.map(order => (
                  <>
                    <tr
                      key={order.id}
                      className={expanded === order.id ? 'row-expanded' : ''}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                    >
                      <td><code>#{order.id.slice(0, 8).toUpperCase()}</code></td>
                      <td>
                        <div>{order.user_name || 'Guest'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>{order.user_email}</div>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{new Date(order.created_at).toLocaleDateString()}</td>
                      <td>{(order.items || []).filter(Boolean).length} items</td>
                      <td><strong>${parseFloat(order.total).toFixed(2)}</strong></td>
                      <td style={{ fontSize: '0.82rem', textTransform: 'capitalize' }}>{order.payment_method?.replace(/_/g, ' ')}</td>
                      <td><span className={`badge ${STATUS_BADGE[order.status]}`}>{order.status}</span></td>
                      <td onClick={e => e.stopPropagation()}>
                        <select
                          className="form-input"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem', width: 'auto' }}
                          value={order.status}
                          onChange={e => updateStatus(order.id, e.target.value)}
                        >
                          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                    </tr>
                    {expanded === order.id && (
                      <tr key={`${order.id}-expanded`} className="expanded-row">
                        <td colSpan="8">
                          <div className="order-expand-content">
                            <div className="order-expand-section">
                              <strong>Shipping Address</strong>
                              {order.shipping_address && (
                                <p>
                                  {order.shipping_address.full_name} · {order.shipping_address.phone}<br />
                                  {order.shipping_address.address_line1}, {order.shipping_address.city}, {order.shipping_address.country}
                                </p>
                              )}
                            </div>
                            <div className="order-expand-items">
                              <strong>Items</strong>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                                {(order.items || []).filter(Boolean).map(item => (
                                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.875rem' }}>
                                    <img src={item.product_image} alt="" style={{ width: 36, height: 36, borderRadius: 4, objectFit: 'cover', background: 'var(--cream-dark)' }} />
                                    <span style={{ flex: 1 }}>{item.product_name}</span>
                                    <span style={{ color: 'var(--ink-muted)' }}>× {item.quantity}</span>
                                    <strong>${parseFloat(item.total_price).toFixed(2)}</strong>
                                  </div>
                                ))}
                              </div>
                            </div>
                            {order.notes && (
                              <div className="order-expand-section">
                                <strong>Notes</strong>
                                <p>{order.notes}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
