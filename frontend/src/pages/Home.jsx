import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { productAPI, categoryAPI } from '../utils/api'
import ProductCard from '../components/ProductCard'
import './Home.css'

export default function Home() {
  const [featured, setFeatured] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      productAPI.list({ featured: 'true', limit: 8 }),
      categoryAPI.list()
    ]).then(([p, c]) => {
      setFeatured(p.data.products)
      setCategories(c.data)
    }).finally(() => setLoading(false))
  }, [])

  return (
    <div className="home page-enter">
      {/* Hero */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="container hero-content">
          <span className="hero-eyebrow">New Collection 2025</span>
          <h1 className="hero-title">
            Discover<br />
            <em>Curated</em> Luxury
          </h1>
          <p className="hero-subtitle">
            Premium products selected for those who appreciate quality without compromise.
          </p>
          <div className="hero-actions">
            <Link to="/products" className="btn btn-primary btn-lg">Explore Collection</Link>
            <Link to="/products?featured=true" className="btn btn-outline btn-lg">View Featured</Link>
          </div>
          <div className="hero-stats">
            <div className="hero-stat"><strong>500+</strong><span>Products</span></div>
            <div className="hero-stat-divider" />
            <div className="hero-stat"><strong>50k+</strong><span>Customers</span></div>
            <div className="hero-stat-divider" />
            <div className="hero-stat"><strong>4.9★</strong><span>Avg Rating</span></div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="section-categories">
        <div className="container">
          <div className="section-header">
            <span className="section-label">Browse By</span>
            <h2 className="section-title">Shop Categories</h2>
          </div>
          <div className="categories-grid">
            {categories.slice(0, 6).map(cat => (
              <Link key={cat.id} to={`/products?category=${cat.slug}`} className="category-card">
                <div className="category-img-wrap">
                  <img src={cat.image} alt={cat.name} />
                </div>
                <div className="category-info">
                  <h3>{cat.name}</h3>
                  <span>{cat.product_count} items</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="section-featured">
        <div className="container">
          <div className="section-header">
            <span className="section-label">Handpicked</span>
            <h2 className="section-title">Featured Products</h2>
          </div>
          {loading ? (
            <div className="page-loader"><div className="spinner" /></div>
          ) : (
            <div className="products-grid">
              {featured.map(p => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
          <div style={{ textAlign: 'center', marginTop: '3rem' }}>
            <Link to="/products" className="btn btn-outline btn-lg">View All Products</Link>
          </div>
        </div>
      </section>

      {/* Banner */}
      <section className="promo-banner">
        <div className="container promo-content">
          <div>
            <h2>Free Shipping on Orders Over $100</h2>
            <p>Plus free returns within 30 days. Shop with confidence.</p>
          </div>
          <Link to="/products" className="btn btn-gold btn-lg">Shop Now</Link>
        </div>
      </section>
    </div>
  )
}
