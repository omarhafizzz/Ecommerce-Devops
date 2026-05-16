import { useState, useEffect } from 'react'
import { productAPI, categoryAPI } from '../utils/api'
import { useToast } from '../context/ToastContext'
import AdminSidebar from '../components/AdminSidebar'
import './Admin.css'

const EMPTY = { name: '', description: '', price: '', compare_price: '', stock: '', images: '', category_id: '', featured: false }

export default function AdminProducts() {
  const { addToast } = useToast()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'create' | product object
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const load = async () => {
    const [p, c] = await Promise.all([productAPI.list({ limit: 100 }), categoryAPI.list()])
    setProducts(p.data.products)
    setCategories(c.data)
  }

  useEffect(() => { load().finally(() => setLoading(false)) }, [])

  const openCreate = () => { setForm(EMPTY); setModal('create') }
  const openEdit = (p) => {
    setForm({ ...p, images: (p.images || []).join(', '), compare_price: p.compare_price || '', category_id: p.category_id || '' })
    setModal(p)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        price: parseFloat(form.price),
        compare_price: form.compare_price ? parseFloat(form.compare_price) : null,
        stock: parseInt(form.stock),
        images: form.images ? form.images.split(',').map(s => s.trim()).filter(Boolean) : [],
      }
      if (modal === 'create') {
        await productAPI.create(payload)
        addToast('Product created!', 'success')
      } else {
        await productAPI.update(modal.id, payload)
        addToast('Product updated!', 'success')
      }
      await load()
      setModal(null)
    } catch (e) {
      addToast(e.response?.data?.error || 'Error saving product', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return
    try {
      await productAPI.remove(id)
      addToast('Product deleted', 'default')
      await load()
    } catch {
      addToast('Could not delete', 'error')
    }
  }

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ display: 'flex', width: '100%' }}>
      <AdminSidebar />
      <div className="admin-content page-enter">
        <div className="admin-page-header">
          <h1 className="admin-page-title">Products</h1>
          <button className="btn btn-primary" onClick={openCreate}>+ Add Product</button>
        </div>

        <div className="admin-toolbar card">
          <input
            className="form-input" style={{ maxWidth: 320 }}
            placeholder="Search products..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
          <span className="admin-count">{filtered.length} products</span>
        </div>

        <div className="card" style={{ marginTop: '1rem' }}>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Rating</th>
                  <th>Featured</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}><div className="spinner" /></td></tr>
                ) : filtered.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div className="table-product">
                        <img src={p.images?.[0] || 'https://via.placeholder.com/40'} alt={p.name} />
                        <span>{p.name}</span>
                      </div>
                    </td>
                    <td>{p.category_name || '—'}</td>
                    <td>
                      <strong>${parseFloat(p.price).toFixed(2)}</strong>
                      {p.compare_price && <span style={{ color: 'var(--ink-muted)', marginLeft: '0.4rem', fontSize: '0.8rem' }}><s>${parseFloat(p.compare_price).toFixed(2)}</s></span>}
                    </td>
                    <td>
                      <span className={`badge ${p.stock === 0 ? 'badge-error' : p.stock < 10 ? 'badge-warning' : 'badge-success'}`}>
                        {p.stock}
                      </span>
                    </td>
                    <td>{parseFloat(p.rating).toFixed(1)} ★ ({p.review_count})</td>
                    <td>{p.featured ? '✦' : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>Edit</button>
                        <button className="btn btn-sm" style={{ background: '#fef2f2', color: 'var(--error)', border: '1px solid #fecaca' }} onClick={() => handleDelete(p.id, p.name)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {modal !== null && (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
            <div className="modal" style={{ maxWidth: 620, maxHeight: '90vh', overflowY: 'auto' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 400, marginBottom: '1.5rem' }}>
                {modal === 'create' ? 'Add Product' : 'Edit Product'}
              </h2>
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input className="form-input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ resize: 'vertical' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Price *</label>
                    <input className="form-input" type="number" step="0.01" required value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Compare Price</label>
                    <input className="form-input" type="number" step="0.01" value={form.compare_price} onChange={e => setForm(f => ({ ...f, compare_price: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Stock *</label>
                    <input className="form-input" type="number" required value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Image URLs (comma separated)</label>
                  <input className="form-input" value={form.images} onChange={e => setForm(f => ({ ...f, images: e.target.value }))} placeholder="https://..." />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="form-input" value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                      <option value="">— Select —</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                    <label className="form-label">Featured</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', paddingTop: '0.5rem' }}>
                      <input type="checkbox" checked={form.featured} onChange={e => setForm(f => ({ ...f, featured: e.target.checked }))} />
                      <span>Mark as featured</span>
                    </label>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : modal === 'create' ? 'Create Product' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
