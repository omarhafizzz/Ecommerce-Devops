import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { productAPI, categoryAPI } from '../utils/api'
import ProductCard from '../components/ProductCard'
import './Products.css'

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const category = searchParams.get('category') || ''
  const search = searchParams.get('search') || ''
  const sort = searchParams.get('sort') || 'created_at'
  const order = searchParams.get('order') || 'DESC'
  const featured = searchParams.get('featured') || ''
  const page = parseInt(searchParams.get('page') || '1')

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await productAPI.list({ category, search, sort, order, featured, page, limit: 12 })
      setProducts(res.data.products)
      setTotal(res.data.total)
      setPages(res.data.pages)
    } finally {
      setLoading(false)
    }
  }, [category, search, sort, order, featured, page])

  useEffect(() => { fetchProducts() }, [fetchProducts])
  useEffect(() => { categoryAPI.list().then(r => setCategories(r.data)) }, [])

  const setParam = (key, val) => {
    const p = new URLSearchParams(searchParams)
    if (val) p.set(key, val); else p.delete(key)
    p.delete('page')
    setSearchParams(p)
  }

  const [searchInput, setSearchInput] = useState(search)

  const handleSearch = (e) => {
    e.preventDefault()
    setParam('search', searchInput)
  }

  return (
    <div className="products-page page-enter">
      <div className="container">
        <div className="products-header">
          <div>
            <h1 className="products-title">
              {category ? categories.find(c => c.slug === category)?.name || 'Products' : featured ? 'Featured' : 'All Products'}
            </h1>
            <p className="products-count">{total} products found</p>
          </div>
          <form onSubmit={handleSearch} className="search-form">
            <input
              className="form-input search-input"
              placeholder="Search products..."
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
            />
            <button type="submit" className="btn btn-primary btn-sm">Search</button>
          </form>
        </div>

        <div className="products-layout">
          {/* Sidebar */}
          <aside className="sidebar">
            <div className="filter-section">
              <h3 className="filter-title">Categories</h3>
              <button className={`filter-option ${!category ? 'active' : ''}`} onClick={() => setParam('category', '')}>
                All Categories
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  className={`filter-option ${category === cat.slug ? 'active' : ''}`}
                  onClick={() => setParam('category', cat.slug)}
                >
                  {cat.name}
                  <span className="filter-count">{cat.product_count}</span>
                </button>
              ))}
            </div>

            <div className="filter-section">
              <h3 className="filter-title">Sort By</h3>
              {[
                { label: 'Newest', sort: 'created_at', order: 'DESC' },
                { label: 'Price: Low to High', sort: 'price', order: 'ASC' },
                { label: 'Price: High to Low', sort: 'price', order: 'DESC' },
                { label: 'Top Rated', sort: 'rating', order: 'DESC' },
                { label: 'Most Reviewed', sort: 'review_count', order: 'DESC' },
              ].map(opt => (
                <button
                  key={opt.label}
                  className={`filter-option ${sort === opt.sort && order === opt.order ? 'active' : ''}`}
                  onClick={() => { setParam('sort', opt.sort); setParam('order', opt.order) }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="filter-section">
              <h3 className="filter-title">Filter</h3>
              <button
                className={`filter-option ${featured ? 'active' : ''}`}
                onClick={() => setParam('featured', featured ? '' : 'true')}
              >
                ✦ Featured Only
              </button>
            </div>
          </aside>

          {/* Grid */}
          <div className="products-main">
            {loading ? (
              <div className="page-loader" style={{ minHeight: '400px' }}><div className="spinner" /></div>
            ) : products.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🔍</div>
                <h3>No products found</h3>
                <p>Try adjusting your search or filters</p>
                <button className="btn btn-outline" onClick={() => setSearchParams({})}>Clear Filters</button>
              </div>
            ) : (
              <>
                <div className="products-grid-inner">
                  {products.map(p => <ProductCard key={p.id} product={p} />)}
                </div>
                {pages > 1 && (
                  <div className="pagination">
                    {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        className={`page-btn ${page === p ? 'active' : ''}`}
                        onClick={() => { const sp = new URLSearchParams(searchParams); sp.set('page', p); setSearchParams(sp) }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
