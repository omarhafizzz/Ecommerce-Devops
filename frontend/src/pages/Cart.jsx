import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import './Cart.css'

export default function Cart() {
  const { cart, updateItem, removeItem, clearCart, loading } = useCart()
  const { addToast } = useToast()

  const handleUpdate = async (id, qty) => {
    try { await updateItem(id, qty) } catch { addToast('Could not update cart', 'error') }
  }

  const handleRemove = async (id, name) => {
    try { await removeItem(id); addToast(`${name} removed`, 'default') } catch { addToast('Error removing item', 'error') }
  }

  const handleClear = async () => {
    try { await clearCart(); addToast('Cart cleared', 'default') } catch { addToast('Error clearing cart', 'error') }
  }

  const shipping = cart.subtotal >= 100 ? 0 : 9.99
  const total = cart.subtotal + shipping

  if (loading) return <div className="page-loader"><div className="spinner" /></div>

  return (
    <div className="cart-page page-enter">
      <div className="container">
        <h1 className="cart-title">Shopping Cart</h1>

        {cart.items.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🛍️</div>
            <h3>Your cart is empty</h3>
            <p>Looks like you haven't added anything yet.</p>
            <Link to="/products" className="btn btn-primary">Start Shopping</Link>
          </div>
        ) : (
          <div className="cart-layout">
            {/* Items */}
            <div className="cart-items">
              <div className="cart-items-header">
                <span>{cart.items.length} item{cart.items.length !== 1 ? 's' : ''}</span>
                <button className="btn btn-ghost btn-sm" onClick={handleClear}>Clear All</button>
              </div>

              {cart.items.map(item => (
                <div key={item.id} className="cart-item">
                  <Link to={`/products/${item.product_id}`} className="cart-item-img">
                    <img
                      src={item.images?.[0] || 'https://via.placeholder.com/100x100?text=Item'}
                      alt={item.name}
                    />
                  </Link>
                  <div className="cart-item-info">
                    <Link to={`/products/${item.product_id}`} className="cart-item-name">{item.name}</Link>
                    <div className="cart-item-price">${parseFloat(item.price).toFixed(2)} each</div>
                    {item.stock < 5 && item.stock > 0 && (
                      <span className="badge badge-warning">Only {item.stock} left</span>
                    )}
                  </div>
                  <div className="cart-item-controls">
                    <div className="qty-control">
                      <button onClick={() => handleUpdate(item.id, item.quantity - 1)}>−</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => handleUpdate(item.id, item.quantity + 1)} disabled={item.quantity >= item.stock}>+</button>
                    </div>
                    <div className="cart-item-subtotal">${(item.price * item.quantity).toFixed(2)}</div>
                    <button className="cart-remove-btn" onClick={() => handleRemove(item.id, item.name)} title="Remove">✕</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="cart-summary">
              <div className="summary-card card">
                <h2 className="summary-title">Order Summary</h2>
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>${cart.subtotal.toFixed(2)}</span>
                </div>
                <div className="summary-row">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? <span className="text-success">Free</span> : `$${shipping.toFixed(2)}`}</span>
                </div>
                {shipping > 0 && (
                  <div className="free-shipping-note">
                    Add ${(100 - cart.subtotal).toFixed(2)} more for free shipping
                  </div>
                )}
                <div className="divider" />
                <div className="summary-row summary-total">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <Link to="/checkout" className="btn btn-primary btn-full btn-lg" style={{ marginTop: '1.5rem' }}>
                  Proceed to Checkout
                </Link>
                <Link to="/products" className="btn btn-ghost btn-full" style={{ marginTop: '0.75rem' }}>
                  Continue Shopping
                </Link>
              </div>

              <div className="trust-badges">
                <div className="trust-badge">🔒 Secure Payment</div>
                <div className="trust-badge">↩ Free Returns</div>
                <div className="trust-badge">🚚 Fast Delivery</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
