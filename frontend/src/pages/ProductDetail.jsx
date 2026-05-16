import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { productAPI } from '../utils/api'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import './ProductDetail.css'

function Stars({ rating, interactive, onRate }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="stars" style={interactive ? { cursor: 'pointer' } : {}}>
      {[1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          className={`star ${i <= (hover || Math.round(rating)) ? 'filled' : ''}`}
          style={{ fontSize: interactive ? '1.5rem' : '0.9rem' }}
          onMouseEnter={() => interactive && setHover(i)}
          onMouseLeave={() => interactive && setHover(0)}
          onClick={() => interactive && onRate && onRate(i)}
        >★</span>
      ))}
    </div>
  )
}

export default function ProductDetail() {
  const { id } = useParams()
  const { addToCart } = useCart()
  const { user } = useAuth()
  const { addToast } = useToast()
  const [product, setProduct] = useState(null)
  const [reviews, setReviews] = useState([])
  const [qty, setQty] = useState(1)
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeImg, setActiveImg] = useState(0)
  const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', body: '' })
  const [submittingReview, setSubmittingReview] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([productAPI.get(id), productAPI.getReviews(id)])
      .then(([p, r]) => { setProduct(p.data); setReviews(r.data) })
      .finally(() => setLoading(false))
  }, [id])

  const handleAdd = async () => {
    if (!user) { addToast('Please sign in first', 'error'); return }
    setAdding(true)
    try {
      await addToCart(product.id, qty)
      addToast(`${product.name} added to cart!`, 'success')
    } catch (e) {
      addToast(e.response?.data?.error || 'Error adding to cart', 'error')
    } finally {
      setAdding(false)
    }
  }

  const handleReview = async (e) => {
    e.preventDefault()
    setSubmittingReview(true)
    try {
      await productAPI.addReview(product.id, reviewForm)
      addToast('Review submitted!', 'success')
      const r = await productAPI.getReviews(product.id)
      setReviews(r.data)
      const p = await productAPI.get(id)
      setProduct(p.data)
    } catch (e) {
      addToast(e.response?.data?.error || 'Could not submit review', 'error')
    } finally {
      setSubmittingReview(false)
    }
  }

  if (loading) return <div className="page-loader"><div className="spinner" /></div>
  if (!product) return <div className="container" style={{padding:'4rem 2rem'}}><h2>Product not found</h2></div>

  const discount = product.compare_price
    ? Math.round((1 - product.price / product.compare_price) * 100)
    : null

  return (
    <div className="product-detail page-enter">
      <div className="container">
        {/* Breadcrumb */}
        <div className="breadcrumb">
          <Link to="/">Home</Link> / <Link to="/products">Shop</Link>
          {product.category_name && <> / <Link to={`/products?category=${product.category_slug}`}>{product.category_name}</Link></>}
          / <span>{product.name}</span>
        </div>

        <div className="detail-grid">
          {/* Images */}
          <div className="detail-images">
            <div className="main-image">
              <img
                src={product.images?.[activeImg] || 'https://via.placeholder.com/600x600?text=Product'}
                alt={product.name}
              />
              {discount && <span className="detail-badge">−{discount}%</span>}
            </div>
            {product.images?.length > 1 && (
              <div className="thumb-row">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    className={`thumb ${i === activeImg ? 'active' : ''}`}
                    onClick={() => setActiveImg(i)}
                  >
                    <img src={img} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="detail-info">
            {product.category_name && (
              <Link to={`/products?category=${product.category_slug}`} className="detail-category">
                {product.category_name}
              </Link>
            )}
            <h1 className="detail-name">{product.name}</h1>

            {product.review_count > 0 && (
              <div className="detail-rating">
                <Stars rating={product.rating} />
                <span>{parseFloat(product.rating).toFixed(1)} ({product.review_count} reviews)</span>
              </div>
            )}

            <div className="detail-price">
              <span className="detail-price-current">${parseFloat(product.price).toFixed(2)}</span>
              {product.compare_price && (
                <span className="detail-price-original">${parseFloat(product.compare_price).toFixed(2)}</span>
              )}
              {discount && <span className="badge badge-gold">Save {discount}%</span>}
            </div>

            <p className="detail-desc">{product.description}</p>

            <div className="detail-stock">
              {product.stock > 0 ? (
                <span className="in-stock">✓ In Stock ({product.stock} available)</span>
              ) : (
                <span className="out-stock">✕ Out of Stock</span>
              )}
            </div>

            {product.stock > 0 && (
              <div className="detail-actions">
                <div className="qty-control">
                  <button onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                  <span>{qty}</span>
                  <button onClick={() => setQty(q => Math.min(product.stock, q + 1))}>+</button>
                </div>
                <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={handleAdd} disabled={adding}>
                  {adding ? <><span className="spinner" style={{width:18,height:18,borderWidth:2}} /> Adding...</> : '🛒 Add to Cart'}
                </button>
              </div>
            )}

            <div className="detail-perks">
              <div className="perk">🚚 Free shipping over $100</div>
              <div className="perk">↩ 30-day returns</div>
              <div className="perk">🔒 Secure checkout</div>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div className="reviews-section">
          <h2 className="reviews-title">Customer Reviews</h2>

          {user && (
            <form className="review-form card" onSubmit={handleReview}>
              <h3>Write a Review</h3>
              <div className="form-group">
                <label className="form-label">Rating</label>
                <Stars rating={reviewForm.rating} interactive onRate={r => setReviewForm(f => ({ ...f, rating: r }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input className="form-input" value={reviewForm.title} onChange={e => setReviewForm(f => ({ ...f, title: e.target.value }))} placeholder="Summary of your review" />
              </div>
              <div className="form-group">
                <label className="form-label">Review</label>
                <textarea className="form-input" rows={4} value={reviewForm.body} onChange={e => setReviewForm(f => ({ ...f, body: e.target.value }))} placeholder="Share your experience..." style={{ resize: 'vertical' }} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={submittingReview}>
                {submittingReview ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>
          )}

          {reviews.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <div className="empty-state-icon">💬</div>
              <h3>No reviews yet</h3>
              <p>Be the first to review this product</p>
            </div>
          ) : (
            <div className="reviews-list">
              {reviews.map(r => (
                <div key={r.id} className="review-item card">
                  <div className="review-header">
                    <div className="reviewer-avatar">{r.user_name?.[0]?.toUpperCase() || '?'}</div>
                    <div>
                      <div className="reviewer-name">{r.user_name || 'Anonymous'}</div>
                      <div className="review-date">{new Date(r.created_at).toLocaleDateString()}</div>
                    </div>
                    <div style={{ marginLeft: 'auto' }}><Stars rating={r.rating} /></div>
                  </div>
                  {r.title && <div className="review-title">{r.title}</div>}
                  {r.body && <p className="review-body">{r.body}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
