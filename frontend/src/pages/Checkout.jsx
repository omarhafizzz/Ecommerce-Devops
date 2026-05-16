import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { orderAPI } from '../utils/api'
import './Checkout.css'

const STEPS = ['Shipping', 'Payment', 'Review']

export default function Checkout() {
  const { cart, fetchCart } = useCart()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [placing, setPlacing] = useState(false)
  const [orderDone, setOrderDone] = useState(null)

  const [shipping, setShipping] = useState({
    full_name: '', phone: '', address_line1: '', address_line2: '',
    city: '', state: '', zip_code: '', country: 'Egypt'
  })
  const [payment, setPayment] = useState('cash_on_delivery')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState({})

  const shippingCost = cart.subtotal >= 100 ? 0 : 9.99
  const total = cart.subtotal + shippingCost

  const validateShipping = () => {
    const e = {}
    if (!shipping.full_name.trim()) e.full_name = 'Name is required'
    if (!shipping.phone.trim()) e.phone = 'Phone is required'
    if (!shipping.address_line1.trim()) e.address_line1 = 'Address is required'
    if (!shipping.city.trim()) e.city = 'City is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleNext = () => {
    if (step === 0 && !validateShipping()) return
    setStep(s => s + 1)
  }

  const handlePlaceOrder = async () => {
    setPlacing(true)
    try {
      const res = await orderAPI.create({
        shipping_address: shipping,
        payment_method: payment,
        notes
      })
      await fetchCart()
      setOrderDone(res.data)
      addToast('Order placed successfully!', 'success')
    } catch (e) {
      addToast(e.response?.data?.error || 'Failed to place order', 'error')
    } finally {
      setPlacing(false)
    }
  }

  if (orderDone) {
    return (
      <div className="checkout-page page-enter">
        <div className="container">
          <div className="order-success">
            <div className="success-icon">✓</div>
            <h1>Order Confirmed!</h1>
            <p>Thank you for your order. We'll process it right away.</p>
            <div className="success-details card">
              <div className="success-row"><span>Order ID</span><strong>#{orderDone.id.slice(0, 8).toUpperCase()}</strong></div>
              <div className="success-row"><span>Total</span><strong>${parseFloat(orderDone.total).toFixed(2)}</strong></div>
              <div className="success-row"><span>Status</span><span className="badge badge-success">Confirmed</span></div>
              <div className="success-row"><span>Payment</span><span>{orderDone.payment_method?.replace(/_/g, ' ')}</span></div>
            </div>
            <div className="success-actions">
              <Link to="/orders" className="btn btn-primary btn-lg">View My Orders</Link>
              <Link to="/products" className="btn btn-outline btn-lg">Continue Shopping</Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="checkout-page page-enter">
      <div className="container">
        <h1 className="checkout-title">Checkout</h1>

        {/* Stepper */}
        <div className="stepper">
          {STEPS.map((s, i) => (
            <div key={s} className={`step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
              <div className="step-circle">{i < step ? '✓' : i + 1}</div>
              <span className="step-label">{s}</span>
              {i < STEPS.length - 1 && <div className="step-line" />}
            </div>
          ))}
        </div>

        <div className="checkout-layout">
          <div className="checkout-form">

            {/* Step 0: Shipping */}
            {step === 0 && (
              <div className="form-card card">
                <h2 className="form-card-title">Shipping Address</h2>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input className="form-input" value={shipping.full_name} onChange={e => setShipping(s => ({ ...s, full_name: e.target.value }))} placeholder="John Doe" />
                    {errors.full_name && <span className="form-error">{errors.full_name}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone *</label>
                    <input className="form-input" value={shipping.phone} onChange={e => setShipping(s => ({ ...s, phone: e.target.value }))} placeholder="+20 xxx xxx xxxx" />
                    {errors.phone && <span className="form-error">{errors.phone}</span>}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Address Line 1 *</label>
                  <input className="form-input" value={shipping.address_line1} onChange={e => setShipping(s => ({ ...s, address_line1: e.target.value }))} placeholder="Street address" />
                  {errors.address_line1 && <span className="form-error">{errors.address_line1}</span>}
                </div>
                <div className="form-group">
                  <label className="form-label">Address Line 2</label>
                  <input className="form-input" value={shipping.address_line2} onChange={e => setShipping(s => ({ ...s, address_line2: e.target.value }))} placeholder="Apartment, suite, etc. (optional)" />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">City *</label>
                    <input className="form-input" value={shipping.city} onChange={e => setShipping(s => ({ ...s, city: e.target.value }))} placeholder="Cairo" />
                    {errors.city && <span className="form-error">{errors.city}</span>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">State / Governorate</label>
                    <input className="form-input" value={shipping.state} onChange={e => setShipping(s => ({ ...s, state: e.target.value }))} placeholder="Cairo Governorate" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">ZIP Code</label>
                    <input className="form-input" value={shipping.zip_code} onChange={e => setShipping(s => ({ ...s, zip_code: e.target.value }))} placeholder="11511" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Country</label>
                  <select className="form-input" value={shipping.country} onChange={e => setShipping(s => ({ ...s, country: e.target.value }))}>
                    <option>Egypt</option>
                    <option>Saudi Arabia</option>
                    <option>UAE</option>
                    <option>Kuwait</option>
                    <option>Qatar</option>
                    <option>Jordan</option>
                    <option>Lebanon</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
            )}

            {/* Step 1: Payment */}
            {step === 1 && (
              <div className="form-card card">
                <h2 className="form-card-title">Payment Method</h2>
                <div className="payment-options">
                  {[
                    { value: 'cash_on_delivery', label: 'Cash on Delivery', icon: '💵', desc: 'Pay when you receive your order' },
                    { value: 'credit_card', label: 'Credit / Debit Card', icon: '💳', desc: 'Visa, Mastercard, etc.' },
                    { value: 'bank_transfer', label: 'Bank Transfer', icon: '🏦', desc: 'Direct bank transfer' },
                  ].map(opt => (
                    <label key={opt.value} className={`payment-option ${payment === opt.value ? 'selected' : ''}`}>
                      <input type="radio" name="payment" value={opt.value} checked={payment === opt.value} onChange={() => setPayment(opt.value)} />
                      <span className="payment-icon">{opt.icon}</span>
                      <div>
                        <div className="payment-label">{opt.label}</div>
                        <div className="payment-desc">{opt.desc}</div>
                      </div>
                      <span className="payment-check">{payment === opt.value ? '●' : '○'}</span>
                    </label>
                  ))}
                </div>
                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                  <label className="form-label">Order Notes (optional)</label>
                  <textarea className="form-input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any special instructions for your order..." style={{ resize: 'vertical' }} />
                </div>
              </div>
            )}

            {/* Step 2: Review */}
            {step === 2 && (
              <div className="form-card card">
                <h2 className="form-card-title">Review Your Order</h2>
                <div className="review-section">
                  <h3>Shipping To</h3>
                  <p>{shipping.full_name} · {shipping.phone}</p>
                  <p>{shipping.address_line1}{shipping.address_line2 ? `, ${shipping.address_line2}` : ''}</p>
                  <p>{shipping.city}{shipping.state ? `, ${shipping.state}` : ''} {shipping.zip_code}</p>
                  <p>{shipping.country}</p>
                </div>
                <div className="divider" />
                <div className="review-section">
                  <h3>Payment</h3>
                  <p>{payment.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
                </div>
                <div className="divider" />
                <div className="review-section">
                  <h3>Items ({cart.items.length})</h3>
                  {cart.items.map(item => (
                    <div key={item.id} className="review-item-row">
                      <img src={item.images?.[0] || 'https://via.placeholder.com/50x50'} alt={item.name} />
                      <span className="review-item-name">{item.name}</span>
                      <span className="review-item-qty">× {item.quantity}</span>
                      <span className="review-item-price">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="checkout-nav">
              {step > 0 && (
                <button className="btn btn-ghost" onClick={() => setStep(s => s - 1)}>← Back</button>
              )}
              {step < 2 ? (
                <button className="btn btn-primary" onClick={handleNext}>Continue →</button>
              ) : (
                <button className="btn btn-gold btn-lg" onClick={handlePlaceOrder} disabled={placing}>
                  {placing ? <><span className="spinner" style={{width:18,height:18,borderWidth:2}} /> Placing Order...</> : '✓ Place Order'}
                </button>
              )}
            </div>
          </div>

          {/* Order summary sidebar */}
          <div className="checkout-summary">
            <div className="summary-card card">
              <h3 className="summary-title">Order Summary</h3>
              <div className="checkout-items">
                {cart.items.map(item => (
                  <div key={item.id} className="checkout-item-row">
                    <div className="checkout-item-img">
                      <img src={item.images?.[0] || ''} alt={item.name} />
                      <span className="checkout-item-qty">{item.quantity}</span>
                    </div>
                    <span className="checkout-item-name">{item.name}</span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="divider" />
              <div className="summary-row"><span>Subtotal</span><span>${cart.subtotal.toFixed(2)}</span></div>
              <div className="summary-row"><span>Shipping</span><span>{shippingCost === 0 ? 'Free' : `$${shippingCost.toFixed(2)}`}</span></div>
              <div className="divider" />
              <div className="summary-row summary-total"><span>Total</span><span>${total.toFixed(2)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
