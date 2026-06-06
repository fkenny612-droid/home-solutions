'use client'
import { useState, useEffect } from 'react'

const DEMO_STORE = {
  id:   'store-demo',
  name: 'Builders Warehouse Durban',
}

const STATUS_COLORS: Record<string, string> = {
  pending:   '#D97706',
  confirmed: '#2D8A6E',
  ready:     '#1D4ED8',
  delivered: '#6B7280',
}

export default function HardwareDashboard() {
  const [tab,      setTab]      = useState<'overview' | 'products' | 'orders'>('overview')
  const [stats,    setStats]    = useState({ totalOrders: 0, pendingOrders: 0, products: 0, totalRevenue: 0 })
  const [products, setProducts] = useState<any[]>([])
  const [orders,   setOrders]   = useState<any[]>([])
  const [showAdd,  setShowAdd]  = useState(false)
  const [newProd,  setNewProd]  = useState({ name: '', category: 'general', unit: 'each', price: '', sku: '', description: '' })

  const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://home-solutions-ds5b.onrender.com/api/v1'

  useEffect(() => {
    fetch(`${BASE}/hardware/stores/${DEMO_STORE.id}/stats`).then(r => r.json()).then(setStats).catch(() => {})
    fetch(`${BASE}/hardware/stores/${DEMO_STORE.id}/products`).then(r => r.json()).then(setProducts).catch(() => {})
    fetch(`${BASE}/hardware/stores/${DEMO_STORE.id}/orders`).then(r => r.json()).then(setOrders).catch(() => {})
  }, [])

  const addProduct = async () => {
    if (!newProd.name || !newProd.price) return
    const res = await fetch(`${BASE}/hardware/stores/${DEMO_STORE.id}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newProd, price: parseFloat(newProd.price) }),
    })
    const prod = await res.json()
    setProducts(prev => [prod, ...prev])
    setNewProd({ name: '', category: 'general', unit: 'each', price: '', sku: '', description: '' })
    setShowAdd(false)
  }

  const updateOrderStatus = async (id: string, status: string) => {
    await fetch(`${BASE}/hardware/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
  }

  const toggleStock = async (id: string, inStock: boolean) => {
    await fetch(`${BASE}/hardware/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inStock }),
    })
    setProducts(prev => prev.map(p => p.id === id ? { ...p, inStock } : p))
  }

  return (
    <div className="hardware-dashboard">
      {/* Header */}
      <div className="hw-header">
        <div>
          <p className="hw-header-tag">🏪 Hardware Store Portal</p>
          <h1 className="hw-header-name">{DEMO_STORE.name}</h1>
        </div>
        <div className="hw-header-badge">Active partner</div>
      </div>

      {/* Stats */}
      <div className="hw-stats">
        {[
          { label: 'Total orders',   value: stats.totalOrders,                       icon: '📦' },
          { label: 'Pending',        value: stats.pendingOrders,                     icon: '⏳', highlight: true },
          { label: 'Products listed',value: stats.products,                          icon: '🏷️' },
          { label: 'Revenue',        value: `R ${(stats.totalRevenue/1000).toFixed(1)}k`, icon: '💰' },
        ].map((s, i) => (
          <div key={i} className={`hw-stat-card ${s.highlight ? 'hw-stat-highlight' : ''}`}>
            <span className="hw-stat-icon">{s.icon}</span>
            <span className="hw-stat-val">{s.value}</span>
            <span className="hw-stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="hw-tabs">
        {(['overview','products','orders'] as const).map(t => (
          <button key={t} className={`hw-tab ${tab === t ? 'hw-tab-active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        <div className="hw-section">
          <h3 className="hw-section-title">Recent orders</h3>
          {orders.slice(0, 5).map(order => (
            <div key={order.id} className="hw-order-card">
              <div className="hw-order-meta">
                <span className="hw-order-id">#{order.id.slice(-6).toUpperCase()}</span>
                <span className="hw-order-items">{order.items?.length ?? 0} items</span>
                <span className="hw-order-amt">R {order.totalAmount?.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className="hw-status-badge" style={{ backgroundColor: STATUS_COLORS[order.status] + '20', color: STATUS_COLORS[order.status] }}>
                  {order.status}
                </span>
                {order.status === 'pending' && (
                  <button className="hw-btn-sm" onClick={() => updateOrderStatus(order.id, 'confirmed')}>Confirm</button>
                )}
              </div>
            </div>
          ))}
          {orders.length === 0 && <p className="hw-empty">No orders yet — providers will order materials here</p>}
        </div>
      )}

      {/* Products */}
      {tab === 'products' && (
        <div className="hw-section">
          <div className="hw-section-header">
            <h3 className="hw-section-title">Product catalogue</h3>
            <button className="hw-btn-primary" onClick={() => setShowAdd(v => !v)}>
              {showAdd ? 'Cancel' : '+ Add product'}
            </button>
          </div>

          {showAdd && (
            <div className="hw-add-form">
              <div className="hw-form-row">
                <input className="hw-input" placeholder="Product name *" value={newProd.name} onChange={e => setNewProd(p => ({ ...p, name: e.target.value }))} />
                <input className="hw-input" placeholder="SKU" value={newProd.sku} onChange={e => setNewProd(p => ({ ...p, sku: e.target.value }))} />
              </div>
              <div className="hw-form-row">
                <select className="hw-input" value={newProd.category} onChange={e => setNewProd(p => ({ ...p, category: e.target.value }))}>
                  {['plumbing','electrical','tiling','painting','general','carpentry','roofing'].map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
                <select className="hw-input" value={newProd.unit} onChange={e => setNewProd(p => ({ ...p, unit: e.target.value }))}>
                  {['each','m','m²','kg','L','bag','pack','roll'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <input className="hw-input" placeholder="Price (R) *" type="number" value={newProd.price} onChange={e => setNewProd(p => ({ ...p, price: e.target.value }))} />
              </div>
              <input className="hw-input" placeholder="Description (optional)" value={newProd.description} onChange={e => setNewProd(p => ({ ...p, description: e.target.value }))} />
              <button className="hw-btn-primary" onClick={addProduct}>Save product</button>
            </div>
          )}

          <table className="hw-table">
            <thead>
              <tr>
                <th>Product</th><th>Category</th><th>SKU</th><th>Unit</th><th>Price</th><th>Stock</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td><span className="hw-cat-badge">{p.category}</span></td>
                  <td className="hw-mono">{p.sku ?? '—'}</td>
                  <td>{p.unit}</td>
                  <td><strong>R{p.price.toFixed(2)}</strong></td>
                  <td>
                    <button
                      className={`hw-stock-btn ${p.inStock ? 'hw-stock-in' : 'hw-stock-out'}`}
                      onClick={() => toggleStock(p.id, !p.inStock)}
                    >
                      {p.inStock ? 'In stock' : 'Out of stock'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && <p className="hw-empty">No products yet — add your first product above</p>}
        </div>
      )}

      {/* Orders */}
      {tab === 'orders' && (
        <div className="hw-section">
          <h3 className="hw-section-title">All material orders</h3>
          {orders.map(order => (
            <div key={order.id} className="hw-order-detail">
              <div className="hw-order-detail-header">
                <div>
                  <span className="hw-order-id">#{order.id.slice(-6).toUpperCase()}</span>
                  <span className="hw-order-date"> · {new Date(order.createdAt).toLocaleDateString('en-ZA')}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className="hw-status-badge" style={{ backgroundColor: STATUS_COLORS[order.status] + '20', color: STATUS_COLORS[order.status] }}>
                    {order.status}
                  </span>
                  <select
                    className="hw-input hw-status-select"
                    value={order.status}
                    onChange={e => updateOrderStatus(order.id, e.target.value)}
                  >
                    {['pending','confirmed','ready','delivered'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              {order.items?.map((item: any) => (
                <div key={item.id} className="hw-order-item">
                  <span>{item.product?.name ?? item.productId}</span>
                  <span className="hw-order-item-qty">× {item.quantity} {item.product?.unit}</span>
                  <span className="hw-order-item-total">R{item.total?.toFixed(2)}</span>
                </div>
              ))}
              <div className="hw-order-total">Total: <strong>R{order.totalAmount?.toFixed(2)}</strong></div>
              {order.notes && <p className="hw-order-notes">📝 {order.notes}</p>}
            </div>
          ))}
          {orders.length === 0 && <p className="hw-empty">No orders yet</p>}
        </div>
      )}
    </div>
  )
}
