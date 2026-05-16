import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useState } from 'react'
import './ProductCard.css'

function Stars({ rating }) {
  return (
    <div className="stars">
      {[1,2,3,4,5].map(i => (
        <span key={i} className={`star ${i <= Math.round(rating) ? 'filled' : ''}`}>★</span>
      ))}
    </div>
  )
}

export default function ProductCard({ product }) {
  const { addToCart } = useCart()
  const { user } = useAuth()
  const { addToast } = useToast()
  const [adding, setAdding] = useState(false)

  const discount = product.compare_price
    ? Math.round((1 - product.price / product.compare_price) * 100)
    : null

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!user) { addToast('Please sign in to add to cart', 'error'); return }
    setAdding(true)
    try {
      await addToCart(product.id)
      addToast(`${product.name} added to cart`, 'success')
    } catch {
      addToast('Could not add to cart', 'error')
    } finally {
      setAdding(false)
    }
  }

  return (
    <Link to={`/products/${product.id}`} className="product-card">
      <div className="product-img-wrap">
        <img
          src={product.images?.[0] || 'https://via.placeholder.com/400x400?text=Product'}
          alt={product.name}
          className="product-img"
          loading="lazy"
        />
        {discount && <span className="product-badge">−{discount}%</span>}
        {product.stock === 0 && <div className="out-of-stock-overlay">Out of Stock</div>}
        <button
          className={`quick-add ${adding ? 'loading' : ''}`}
          onClick={handleAdd}
          disabled={product.stock === 0 || adding}
        >
          {adding ? <span className="spinner" style={{width:16,height:16,borderWidth:2}} /> : '+ Add to Cart'}
        </button>
      </div>
      <div className="product-info">
        {product.category_name && <span className="product-category">{product.category_name}</span>}
        <h3 className="product-name">{product.name}</h3>
        <div className="product-meta">
          {product.review_count > 0 && (
            <div className="product-rating">
              <Stars rating={product.rating} />
              <span className="review-count">({product.review_count})</span>
            </div>
          )}
          <div className="product-price">
            <span className="price-current">${parseFloat(product.price).toFixed(2)}</span>
            {product.compare_price && (
              <span className="price-original">${parseFloat(product.compare_price).toFixed(2)}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
