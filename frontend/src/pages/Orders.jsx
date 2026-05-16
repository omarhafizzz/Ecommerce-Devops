import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { orderAPI } from '../utils/api'
import './Orders.css'

const STATUS_BADGE = {
  pending: 'badge-warning',
  confirmed: 'badge-neutral',
  shipped: 'badge-gold',
  delivered: 'badge-success',
  cancelled: 'badge-error',
}

export default function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    orderAPI.list()
      .then(r => setOrders(r.data))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="page-loader"><div className="spinner" /></div>

  return (
    <div className="orders-page page-enter">
      <div className="container">
        <h1 className="orders-title">My Orders</h1>

        {orders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <h3>No orders yet</h3>
            <p>Your order history will appear here.</p>
            <Link to="/products" className="btn btn-primary">Start Shopping</Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map(order => (
              <div key={order.id} className="order-card card">
                <div className="order-header" onClick={() => setExpanded(expanded === order.id ? null : order.id)}>
                  <div className="order-meta">
                    <span className="order-id">#{order.id.slice(0, 8).toUpperCase()}</span>
                    <span className="order-date">{new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  </div>
                  <div className="order-summary-right">
                    <span className={`badge ${STATUS_BADGE[order.status] || 'badge-neutral'}`}>
                      {order.status}
                    </span>
                    <span className="order-total">${parseFloat(order.total).toFixed(2)}</span>
                    <span className="order-toggle">{expanded === order.id ? '▲' : '▼'}</span>
                  </div>
                </div>

                {expanded === order.id && (
                  <div className="order-details">
                    <div className="divider" />
                    <div className="order-info-grid">
                      <div>
                        <div className="order-info-label">Shipping Address</div>
                        {order.shipping_address && (
                          <div className="order-info-value">
                            <p>{order.shipping_address.full_name}</p>
                            <p>{order.shipping_address.address_line1}</p>
                            <p>{order.shipping_address.city}, {order.shipping_address.country}</p>
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="order-info-label">Payment</div>
                        <div className="order-info-value">
                          {order.payment_method?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </div>
                      </div>
                    </div>

                    <div className="order-items-list">
                      <div className="order-info-label" style={{ marginBottom: '0.75rem' }}>Items</div>
                      {(order.items || []).filter(Boolean).map(item => (
                        <div key={item.id} className="order-item-row">
                          <div className="order-item-img">
                            <img
                              src={item.product_image || 'https://via.placeholder.com/60x60?text=Item'}
                              alt={item.product_name}
                            />
                          </div>
                          <span className="order-item-name">{item.product_name}</span>
                          <span className="order-item-qty">× {item.quantity}</span>
                          <span className="order-item-price">${parseFloat(item.total_price).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="order-totals">
                      <div className="order-total-row">
                        <span>Total</span>
                        <strong>${parseFloat(order.total).toFixed(2)}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
