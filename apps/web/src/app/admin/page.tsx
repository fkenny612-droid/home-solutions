'use client'
import { useState, useEffect } from 'react'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'

// ─── Auth helpers ─────────────────────────────────────────────────────────────
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('hs_admin_token') : null }
function setToken(t: string) { localStorage.setItem('hs_admin_token', t) }
function clearToken() { localStorage.removeItem('hs_admin_token') }

async function apiFetch(path: string, opts?: RequestInit) {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts?.headers ?? {}),
    },
  })
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

// ─── Types ────────────────────────────────────────────────────────────────────
type Section = 'dashboard' | 'bookings' | 'providers' | 'clients' | 'hardware' | 'materials' | 'finance' | 'settings'

const NAV: { section: string; items: { id: Section; label: string; icon: string }[] }[] = [
  { section: 'Operations', items: [
    { id: 'dashboard',  label: 'Dashboard',  icon: '📊' },
    { id: 'bookings',   label: 'Bookings',   icon: '📋' },
  ]},
  { section: 'People', items: [
    { id: 'providers', label: 'Providers',  icon: '🔧' },
    { id: 'clients',   label: 'Clients',    icon: '👥' },
  ]},
  { section: 'Commerce', items: [
    { id: 'hardware',  label: 'Hardware',   icon: '🏪' },
    { id: 'materials', label: 'Materials',  icon: '📦' },
    { id: 'finance',   label: 'Finance',    icon: '💰' },
  ]},
  { section: 'System', items: [
    { id: 'settings',  label: 'Settings',   icon: '⚙️' },
  ]},
]

const STATUS_COLORS: Record<string, string> = {
  pending:     '#D97706', accepted: '#2D8A6E', en_route: '#2D8A6E',
  in_progress: '#C8922A', completed: '#6B7280', cancelled: '#E63946',
  emergency:   '#E63946', active: '#2D8A6E', pending_kyc: '#D97706',
  suspended:   '#E63946', approved: '#2D8A6E', in_review: '#C8922A',
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function AdminPortal() {
  const [authed,   setAuthed]   = useState(false)
  const [loading,  setLoading]  = useState(true)
  const [section,  setSection]  = useState<Section>('dashboard')
  const [phone,    setPhone]    = useState('+27800000000')
  const [password, setPassword] = useState('admin123')
  const [loginErr, setLoginErr] = useState('')

  useEffect(() => {
    if (getToken()) setAuthed(true)
    setLoading(false)
  }, [])

  const login = async () => {
    setLoginErr('')
    try {
      const res = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
      })
      const data = await res.json()
      if (!res.ok || data.user?.role !== 'admin') {
        setLoginErr('Invalid credentials or not an admin account')
        return
      }
      setToken(data.accessToken)
      setAuthed(true)
    } catch { setLoginErr('Could not connect to API') }
  }

  const logout = () => { clearToken(); setAuthed(false) }

  if (loading) return <div style={styles.center}><span>Loading…</span></div>

  if (!authed) return (
    <div style={styles.loginPage}>
      <div style={styles.loginCard}>
        <div style={styles.loginLogo}>
          <div style={styles.logoIcon}>🏠</div>
          <div>
            <div style={styles.logoName}>Home Solutions</div>
            <div style={styles.logoSub}>Admin Portal</div>
          </div>
        </div>
        <h2 style={styles.loginTitle}>Sign in</h2>
        <p style={styles.loginSub}>Admin access only</p>
        <label style={styles.label}>Phone number</label>
        <input style={styles.input} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+27800000000" />
        <label style={styles.label}>Password</label>
        <input style={styles.input} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && login()} />
        {loginErr && <p style={styles.error}>{loginErr}</p>}
        <button style={styles.loginBtn} onClick={login}>Sign in →</button>
        <p style={styles.loginHint}>Default: +27800000000 / admin123</p>
      </div>
    </div>
  )

  return (
    <div style={styles.shell}>
      {/* Sidebar */}
      <nav style={styles.sidebar}>
        <div style={styles.sidebarLogo}>
          <div style={styles.logoIcon}>🏠</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Home Solutions</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, textTransform: 'uppercase' }}>Admin</div>
          </div>
        </div>

        {NAV.map(group => (
          <div key={group.section}>
            <div style={styles.navGroup}>{group.section}</div>
            {group.items.map(item => (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                style={{
                  ...styles.navItem,
                  ...(section === item.id ? styles.navItemActive : {}),
                }}
              >
                <span style={{ fontSize: 15 }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        ))}

        <button style={styles.logoutBtn} onClick={logout}>Sign out</button>
      </nav>

      {/* Main */}
      <div style={styles.main}>
        <div style={styles.topbar}>
          <div>
            <div style={styles.topbarTitle}>{section.charAt(0).toUpperCase() + section.slice(1)}</div>
            <div style={styles.topbarSub}>Home Solutions · Durban & KZN</div>
          </div>
        </div>

        <div style={styles.content}>
          {section === 'dashboard'  && <DashboardSection />}
          {section === 'bookings'   && <BookingsSection />}
          {section === 'providers'  && <ProvidersSection />}
          {section === 'clients'    && <ClientsSection />}
          {section === 'hardware'   && <HardwareSection />}
          {section === 'materials'  && <MaterialsSection />}
          {section === 'finance'    && <FinanceSection />}
          {section === 'settings'   && <SettingsSection />}
        </div>
      </div>
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function DashboardSection() {
  const [stats,     setStats]     = useState<any>(null)
  const [providers, setProviders] = useState<any[]>([])
  const [bookings,  setBookings]  = useState<any[]>([])

  useEffect(() => {
    apiFetch('/bookings/stats').then(setStats).catch(() => {})
    apiFetch('/providers?status=active').then(setProviders).catch(() => {})
    apiFetch('/bookings').then(setBookings).catch(() => {})
  }, [])

  const statCards = [
    { label: 'Active bookings', value: stats?.active ?? '—',     icon: '📋', color: '#2D8A6E' },
    { label: 'Providers online', value: providers.length || '—', icon: '🔧', color: '#C8922A' },
    { label: 'Total bookings',  value: stats?.total ?? '—',      icon: '📊', color: '#1D4ED8' },
    { label: 'Revenue today',   value: stats?.revenueToday ? `R${(stats.revenueToday/1000).toFixed(1)}k` : 'R0', icon: '💰', color: '#7C3AED' },
  ]

  return (
    <div>
      <div style={styles.statsGrid}>
        {statCards.map(s => (
          <div key={s.label} style={styles.statCard}>
            <div style={{ fontSize: 24 }}>{s.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 300, color: '#0F1923', margin: '6px 0 2px' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#9C9CA0' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={styles.twoCol}>
        <Card title="Recent bookings">
          {bookings.slice(0, 8).map((b: any) => (
            <div key={b.id} style={styles.tableRow}>
              <div style={{ flex: 1 }}>
                <div style={styles.rowTitle}>{b.serviceType} · {b.address}</div>
                <div style={styles.rowSub}>#{b.id.slice(-6).toUpperCase()} · {new Date(b.createdAt).toLocaleDateString('en-ZA')}</div>
              </div>
              <StatusBadge status={b.status} />
              <div style={styles.rowAmt}>R {b.quotedAmount?.toLocaleString()}</div>
            </div>
          ))}
        </Card>
        <Card title="Active providers">
          {providers.slice(0, 8).map((p: any) => (
            <div key={p.id} style={styles.tableRow}>
              <Avatar name={p.name} />
              <div style={{ flex: 1 }}>
                <div style={styles.rowTitle}>{p.name}</div>
                <div style={styles.rowSub}>{p.skills?.join(', ')} · ★ {p.rating}</div>
              </div>
              <StatusBadge status={p.kycStatus} />
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

// ─── Bookings ─────────────────────────────────────────────────────────────────
function BookingsSection() {
  const [bookings, setBookings] = useState<any[]>([])
  const [filter,   setFilter]   = useState('all')
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => {
    apiFetch('/bookings').then(setBookings).catch(() => {})
  }, [])

  const filtered = filter === 'all' ? bookings : bookings.filter(b => b.status === filter)

  const updateStatus = async (id: string, status: string) => {
    await apiFetch(`/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b))
    setSelected((s: any) => s?.id === id ? { ...s, status } : s)
  }

  return (
    <div style={styles.twoColWide}>
      <div style={{ flex: 2 }}>
        <Card title="All bookings" action={
          <div style={styles.filterRow}>
            {['all','pending','accepted','en_route','in_progress','completed','emergency'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ ...styles.filterBtn, ...(filter === f ? styles.filterBtnActive : {}) }}>
                {f === 'all' ? 'All' : f.replace('_',' ')}
              </button>
            ))}
          </div>
        }>
          {filtered.map((b: any) => (
            <div key={b.id} style={{ ...styles.tableRow, cursor: 'pointer', background: selected?.id === b.id ? '#FFFBF0' : 'transparent' }} onClick={() => setSelected(b)}>
              <div style={{ flex: 1 }}>
                <div style={styles.rowTitle}>{b.serviceType?.charAt(0).toUpperCase() + b.serviceType?.slice(1)} — {b.address}</div>
                <div style={styles.rowSub}>#{b.id.slice(-6).toUpperCase()} · Client: {b.clientId?.slice(0,8)} · {new Date(b.createdAt).toLocaleDateString('en-ZA')}</div>
              </div>
              <StatusBadge status={b.status} />
              <div style={styles.rowAmt}>R {b.quotedAmount?.toLocaleString()}</div>
            </div>
          ))}
          {filtered.length === 0 && <Empty text="No bookings found" />}
        </Card>
      </div>

      {selected && (
        <div style={{ flex: 1 }}>
          <Card title={`Booking #${selected.id.slice(-6).toUpperCase()}`} action={<CloseBtn onClick={() => setSelected(null)} />}>
            <Detail label="Service"  value={selected.serviceType} />
            <Detail label="Address"  value={selected.address} />
            <Detail label="Client"   value={selected.clientId} />
            <Detail label="Provider" value={selected.providerId ?? 'Unassigned'} />
            <Detail label="Status"   value={<StatusBadge status={selected.status} />} />
            <Detail label="Quoted"   value={`R ${selected.quotedAmount?.toLocaleString()}`} />
            <Detail label="Payment held"     value={selected.paymentHeld ? 'Yes' : 'No'} />
            <Detail label="Payment released" value={selected.paymentReleased ? 'Yes' : 'No'} />
            {selected.notes && <Detail label="Notes" value={selected.notes} />}
            {selected.images?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={styles.label}>Photos ({selected.images.length})</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                  {selected.images.map((url: string, i: number) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={url} alt="Job photo" style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover' }} />
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
              {['accepted','en_route','in_progress','completed','cancelled'].map(s => (
                <button key={s} style={styles.actionBtn} onClick={() => updateStatus(selected.id, s)}>
                  → {s.replace('_',' ')}
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

// ─── Providers ────────────────────────────────────────────────────────────────
function ProvidersSection() {
  const [providers, setProviders] = useState<any[]>([])
  const [selected,  setSelected]  = useState<any>(null)
  const [docs,      setDocs]      = useState<any[]>([])
  const [filter,    setFilter]    = useState('all')

  useEffect(() => {
    apiFetch('/providers').then(setProviders).catch(() => {})
  }, [])

  const selectProvider = async (p: any) => {
    setSelected(p)
    apiFetch(`/providers/${p.id}/documents`).then(setDocs).catch(() => setDocs([]))
  }

  const updateKyc = async (id: string, status: string) => {
    await apiFetch(`/providers/${id}/kyc`, { method: 'PATCH', body: JSON.stringify({ status }) })
    setProviders(prev => prev.map(p => p.id === id ? { ...p, kycStatus: status, status: status === 'approved' ? 'active' : p.status } : p))
    setSelected((s: any) => s?.id === id ? { ...s, kycStatus: status } : s)
  }

  const filtered = filter === 'all' ? providers : providers.filter(p => p.kycStatus === filter || p.status === filter)

  return (
    <div style={styles.twoColWide}>
      <div style={{ flex: 2 }}>
        <Card title="All providers" action={
          <div style={styles.filterRow}>
            {['all','active','pending_kyc','in_review','approved'].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ ...styles.filterBtn, ...(filter === f ? styles.filterBtnActive : {}) }}>
                {f === 'all' ? 'All' : f.replace('_',' ')}
              </button>
            ))}
          </div>
        }>
          {filtered.map((p: any) => (
            <div key={p.id} style={{ ...styles.tableRow, cursor: 'pointer', background: selected?.id === p.id ? '#FFFBF0' : 'transparent' }} onClick={() => selectProvider(p)}>
              <Avatar name={p.name} />
              <div style={{ flex: 1 }}>
                <div style={styles.rowTitle}>{p.name}</div>
                <div style={styles.rowSub}>{p.skills?.join(', ')} · {p.jobCount} jobs · ★ {p.rating}</div>
              </div>
              <StatusBadge status={p.kycStatus} />
              <StatusBadge status={p.status} />
            </div>
          ))}
          {filtered.length === 0 && <Empty text="No providers found" />}
        </Card>
      </div>

      {selected && (
        <div style={{ flex: 1 }}>
          <Card title={selected.name} action={<CloseBtn onClick={() => setSelected(null)} />}>
            <Detail label="Phone"    value={selected.phone} />
            <Detail label="Email"    value={selected.email ?? '—'} />
            <Detail label="Skills"   value={selected.skills?.join(', ')} />
            <Detail label="Status"   value={<StatusBadge status={selected.status} />} />
            <Detail label="KYC"      value={<StatusBadge status={selected.kycStatus} />} />
            <Detail label="Rating"   value={`★ ${selected.rating} (${selected.reviewCount} reviews)`} />
            <Detail label="Jobs"     value={selected.jobCount} />
            <Detail label="Balance"  value={`R ${selected.earningsBalance?.toLocaleString()}`} />

            <div style={{ marginTop: 12 }}>
              <div style={styles.label}>KYC Documents ({docs.length})</div>
              {docs.map((doc: any) => (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid #EDE8E0' }}>
                  <span style={{ flex: 1, fontSize: 12 }}>{doc.type.replace('_',' ')}</span>
                  <StatusBadge status={doc.status} />
                  <a href={doc.fileUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#C8922A' }}>View →</a>
                </div>
              ))}
              {docs.length === 0 && <p style={{ fontSize: 11, color: '#9C9CA0', margin: '8px 0' }}>No documents uploaded</p>}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
              <button style={{ ...styles.actionBtn, background: '#DCF0E8', color: '#1A5C38', border: 'none' }} onClick={() => updateKyc(selected.id, 'approved')}>✓ Approve KYC</button>
              <button style={{ ...styles.actionBtn, background: '#FEE2E2', color: '#E63946', border: 'none' }} onClick={() => updateKyc(selected.id, 'rejected')}>✕ Reject</button>
              <button style={{ ...styles.actionBtn, background: '#FEF3C7', color: '#92400E', border: 'none' }} onClick={() => updateKyc(selected.id, 'in_review')}>⏳ In review</button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

// ─── Clients ──────────────────────────────────────────────────────────────────
function ClientsSection() {
  const [clients, setClients] = useState<any[]>([])

  useEffect(() => {
    apiFetch('/clients').then(setClients).catch(() => {})
  }, [])

  return (
    <Card title={`Clients (${clients.length})`}>
      {clients.map((c: any) => (
        <div key={c.id} style={styles.tableRow}>
          <Avatar name={c.name ?? c.phone} />
          <div style={{ flex: 1 }}>
            <div style={styles.rowTitle}>{c.firstName ? `${c.firstName} ${c.lastName}` : c.phone}</div>
            <div style={styles.rowSub}>{c.email ?? '—'} · {c.phone}</div>
          </div>
          <div style={styles.rowSub}>{new Date(c.createdAt).toLocaleDateString('en-ZA')}</div>
        </div>
      ))}
      {clients.length === 0 && <Empty text="No clients yet" />}
    </Card>
  )
}

// ─── Hardware ─────────────────────────────────────────────────────────────────
function HardwareSection() {
  const [stores,   setStores]   = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [showAdd,  setShowAdd]  = useState(false)
  const [newStore, setNewStore] = useState({ name: '', email: '', phone: '', address: '', areas: '' })

  useEffect(() => {
    apiFetch('/hardware/stores').then(setStores).catch(() => {})
  }, [])

  const selectStore = async (s: any) => {
    setSelected(s)
    apiFetch(`/hardware/stores/${s.id}/products`).then(setProducts).catch(() => setProducts([]))
  }

  const addStore = async () => {
    const store = await apiFetch('/hardware/stores', {
      method: 'POST',
      body: JSON.stringify({ ...newStore, areas: newStore.areas.split(',').map(a => a.trim()) }),
    })
    setStores(prev => [store, ...prev])
    setShowAdd(false)
    setNewStore({ name: '', email: '', phone: '', address: '', areas: '' })
  }

  const toggleActive = async (id: string, isActive: boolean) => {
    await apiFetch(`/hardware/stores/${id}`, { method: 'PATCH', body: JSON.stringify({ isActive }) })
    setStores(prev => prev.map(s => s.id === id ? { ...s, isActive } : s))
  }

  return (
    <div style={styles.twoColWide}>
      <div style={{ flex: 2 }}>
        <Card title="Hardware stores" action={
          <button style={styles.primaryBtn} onClick={() => setShowAdd(v => !v)}>
            {showAdd ? 'Cancel' : '+ Add store'}
          </button>
        }>
          {showAdd && (
            <div style={styles.addForm}>
              {[
                { key: 'name', label: 'Store name *', placeholder: 'e.g. Builders Warehouse Durban' },
                { key: 'email', label: 'Email *', placeholder: 'store@email.co.za' },
                { key: 'phone', label: 'Phone *', placeholder: '+27311234567' },
                { key: 'address', label: 'Address *', placeholder: '1 Main Rd, Durban' },
                { key: 'areas', label: 'Service areas (comma-separated)', placeholder: 'Durban CBD, Berea, Glenwood' },
              ].map(f => (
                <input key={f.key} style={styles.input} placeholder={f.label} value={(newStore as any)[f.key]} onChange={e => setNewStore(p => ({ ...p, [f.key]: e.target.value }))} />
              ))}
              <button style={styles.primaryBtn} onClick={addStore}>Save store</button>
            </div>
          )}
          {stores.map((s: any) => (
            <div key={s.id} style={{ ...styles.tableRow, cursor: 'pointer', background: selected?.id === s.id ? '#FFFBF0' : 'transparent' }} onClick={() => selectStore(s)}>
              <span style={{ fontSize: 20 }}>🏪</span>
              <div style={{ flex: 1 }}>
                <div style={styles.rowTitle}>{s.name}</div>
                <div style={styles.rowSub}>{s.areas?.join(' · ')} · {s._count?.products ?? 0} products</div>
              </div>
              <button
                style={{ ...styles.actionBtn, background: s.isActive ? '#DCF0E8' : '#FEE2E2', color: s.isActive ? '#1A5C38' : '#E63946', border: 'none', fontSize: 11 }}
                onClick={e => { e.stopPropagation(); toggleActive(s.id, !s.isActive) }}
              >
                {s.isActive ? 'Active' : 'Inactive'}
              </button>
            </div>
          ))}
          {stores.length === 0 && <Empty text="No hardware stores yet" />}
        </Card>
      </div>

      {selected && (
        <div style={{ flex: 1 }}>
          <Card title={selected.name} action={<CloseBtn onClick={() => setSelected(null)} />}>
            <Detail label="Email"   value={selected.email} />
            <Detail label="Phone"   value={selected.phone} />
            <Detail label="Address" value={selected.address} />
            <Detail label="Areas"   value={selected.areas?.join(', ')} />
            <div style={{ marginTop: 12 }}>
              <div style={styles.label}>Products ({products.length})</div>
              {products.slice(0, 10).map((p: any) => (
                <div key={p.id} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: '1px solid #EDE8E0', fontSize: 12 }}>
                  <span style={{ flex: 1 }}>{p.name}</span>
                  <span style={{ color: '#9C9CA0' }}>{p.unit}</span>
                  <span style={{ fontWeight: 600, color: '#0F1923' }}>R{p.price}</span>
                  <span style={{ color: p.inStock ? '#2D8A6E' : '#E63946', fontSize: 10 }}>{p.inStock ? '✓' : '✗'}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

// ─── Materials ────────────────────────────────────────────────────────────────
function MaterialsSection() {
  const [orders, setOrders] = useState<any[]>([])
  const [stores, setStores] = useState<any[]>([])
  const [storeId, setStoreId] = useState('')

  useEffect(() => {
    apiFetch('/hardware/stores').then((s: any[]) => {
      setStores(s)
      if (s.length) {
        setStoreId(s[0].id)
        apiFetch(`/hardware/stores/${s[0].id}/orders`).then(setOrders).catch(() => {})
      }
    }).catch(() => {})
  }, [])

  const changeStore = async (id: string) => {
    setStoreId(id)
    apiFetch(`/hardware/stores/${id}/orders`).then(setOrders).catch(() => {})
  }

  const updateStatus = async (id: string, status: string) => {
    await apiFetch(`/hardware/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
  }

  return (
    <Card title="Material orders" action={
      <select style={styles.input} value={storeId} onChange={e => changeStore(e.target.value)}>
        {stores.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
    }>
      {orders.map((o: any) => (
        <div key={o.id} style={styles.orderCard}>
          <div style={styles.tableRow}>
            <div style={{ flex: 1 }}>
              <div style={styles.rowTitle}>#{o.id.slice(-6).toUpperCase()} · Booking #{o.bookingId?.slice(-6).toUpperCase()}</div>
              <div style={styles.rowSub}>{new Date(o.createdAt).toLocaleDateString('en-ZA')} · {o.items?.length} items</div>
            </div>
            <StatusBadge status={o.status} />
            <div style={styles.rowAmt}>R {o.totalAmount?.toFixed(2)}</div>
          </div>
          <div style={{ paddingLeft: 8, paddingBottom: 8 }}>
            {o.items?.map((item: any) => (
              <div key={item.id} style={{ fontSize: 11, color: '#5C5C60', padding: '2px 0' }}>
                {item.product?.name} × {item.quantity} {item.product?.unit} = R{item.total?.toFixed(2)}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, padding: '0 8px 8px' }}>
            {['pending','confirmed','ready','delivered'].map(s => (
              <button key={s} style={{ ...styles.actionBtn, ...(o.status === s ? { background: '#C8922A', color: '#fff', border: 'none' } : {}) }} onClick={() => updateStatus(o.id, s)}>
                {s}
              </button>
            ))}
          </div>
          {o.notes && <div style={{ fontSize: 11, color: '#9C9CA0', padding: '0 8px 8px' }}>📝 {o.notes}</div>}
        </div>
      ))}
      {orders.length === 0 && <Empty text="No material orders yet" />}
    </Card>
  )
}

// ─── Finance ──────────────────────────────────────────────────────────────────
function FinanceSection() {
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    apiFetch('/bookings/stats').then(setStats).catch(() => {})
  }, [])

  return (
    <div>
      <div style={styles.statsGrid}>
        {[
          { label: 'Total revenue',     value: `R ${((stats?.revenueToday ?? 0) * 30 / 1000).toFixed(0)}k`, icon: '💰', sub: 'Estimated monthly' },
          { label: 'Revenue today',     value: `R ${stats?.revenueToday?.toFixed(0) ?? 0}`,                  icon: '📈', sub: 'Completed bookings' },
          { label: 'Pending payouts',   value: 'R 84,220',  icon: '⏳', sub: '12 providers waiting' },
          { label: 'Platform fee (15%)',value: `R ${((stats?.revenueToday ?? 0) * 0.15).toFixed(0)}`, icon: '🏦', sub: 'Of today\'s revenue' },
        ].map(s => (
          <div key={s.label} style={styles.statCard}>
            <div style={{ fontSize: 24 }}>{s.icon}</div>
            <div style={{ fontSize: 28, fontWeight: 300, color: '#0F1923', margin: '6px 0 2px' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#9C9CA0' }}>{s.label}</div>
            <div style={{ fontSize: 10, color: '#C8922A', marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <Card title="Peach Payments">
        <div style={{ padding: '12px 0', fontSize: 13, color: '#5C5C60', lineHeight: 2 }}>
          <p>🔐 Payment gateway: <strong>Peach Payments</strong></p>
          <p>📋 Mode: <strong>{process.env.NEXT_PUBLIC_PEACH_MODE ?? 'test'}</strong></p>
          <p>💳 Split payout: <strong>Enabled</strong> — 85% provider / 15% platform</p>
          <p>⏱️ Settlement: <strong>1–2 business days</strong></p>
          <p>🛡️ Card hold: <strong>Released on job completion</strong></p>
        </div>
        <button style={styles.primaryBtn}>Process pending payouts →</button>
      </Card>
    </div>
  )
}

// ─── Settings ─────────────────────────────────────────────────────────────────
function SettingsSection() {
  return (
    <div style={styles.twoCol}>
      <Card title="Platform settings">
        {[
          { label: 'Platform commission', value: '15%', type: 'text' },
          { label: 'Emergency surcharge', value: 'R350', type: 'text' },
          { label: 'Warranty period',    value: '90 days', type: 'text' },
          { label: 'Service regions',    value: 'Durban, Umhlanga, Ballito', type: 'text' },
        ].map(s => (
          <div key={s.label} style={{ marginBottom: 14 }}>
            <div style={styles.label}>{s.label}</div>
            <input style={styles.input} defaultValue={s.value} />
          </div>
        ))}
        <button style={styles.primaryBtn}>Save settings</button>
      </Card>

      <Card title="Notifications">
        {[
          { label: 'Push notifications',    enabled: true },
          { label: 'SMS fallback (AT)',      enabled: true },
          { label: 'Email confirmations',   enabled: false },
          { label: 'Emergency alerts',      enabled: true },
          { label: 'Provider KYC alerts',   enabled: true },
        ].map(n => (
          <div key={n.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #EDE8E0' }}>
            <span style={{ fontSize: 13 }}>{n.label}</span>
            <span style={{ fontSize: 12, color: n.enabled ? '#2D8A6E' : '#9C9CA0', fontWeight: 600 }}>{n.enabled ? '● Enabled' : '○ Disabled'}</span>
          </div>
        ))}
      </Card>
    </div>
  )
}

// ─── Shared components ────────────────────────────────────────────────────────
function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div style={styles.cardTitle}>{title}</div>
        {action && <div>{action}</div>}
      </div>
      <div>{children}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] ?? '#6B7280'
  return (
    <span style={{ fontSize: 10, fontWeight: 600, color, background: color + '18', borderRadius: 20, padding: '2px 8px', whiteSpace: 'nowrap' }}>
      {status?.replace(/_/g, ' ')}
    </span>
  )
}

function Avatar({ name }: { name: string }) {
  const initials = name?.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() ?? '?'
  return <div style={styles.avatar}>{initials}</div>
}

function Detail({ label, value }: { label: string; value: any }) {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: '1px solid #EDE8E0', fontSize: 12 }}>
      <span style={{ color: '#9C9CA0', width: 100, flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#1C1C1E', fontWeight: 500 }}>{value}</span>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <div style={{ padding: '24px', textAlign: 'center', fontSize: 13, color: '#9C9CA0' }}>{text}</div>
}

function CloseBtn({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#9C9CA0' }}>✕</button>
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  shell:          { display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'DM Sans', -apple-system, sans-serif", background: '#F7F3EE' },
  sidebar:        { width: 220, background: '#0F1923', display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto' },
  sidebarLogo:    { display: 'flex', alignItems: 'center', gap: 10, padding: '16px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)' },
  logoIcon:       { width: 32, height: 32, background: '#C8922A', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 },
  logoName:       { fontSize: 14, fontWeight: 600, color: '#fff' },
  logoSub:        { fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5, textTransform: 'uppercase' as const },
  navGroup:       { padding: '12px 14px 4px', fontSize: 9, color: 'rgba(255,255,255,0.28)', letterSpacing: 1.5, textTransform: 'uppercase' as const },
  navItem:        { display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px', margin: '1px 8px', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.5)', background: 'transparent', border: 'none', width: 'calc(100% - 16px)', textAlign: 'left' as const, fontFamily: 'inherit' },
  navItemActive:  { background: 'rgba(200,146,42,0.18)', color: '#F0C060' },
  logoutBtn:      { margin: 'auto 12px 12px', padding: '8px 12px', borderRadius: 7, border: 'none', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' as const },
  main:           { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  topbar:         { padding: '14px 24px', background: '#fff', borderBottom: '1px solid #EDE8E0', display: 'flex', alignItems: 'center', flexShrink: 0 },
  topbarTitle:    { fontSize: 18, fontWeight: 600, color: '#0F1923' },
  topbarSub:      { fontSize: 11, color: '#9C9CA0', marginTop: 2 },
  content:        { flex: 1, overflowY: 'auto', padding: 24 },
  statsGrid:      { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 },
  statCard:       { background: '#fff', borderRadius: 12, padding: '16px 18px', border: '1px solid #EDE8E0' },
  twoCol:         { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  twoColWide:     { display: 'flex', gap: 16, alignItems: 'flex-start' },
  card:           { background: '#fff', borderRadius: 12, border: '1px solid #EDE8E0', overflow: 'hidden', marginBottom: 16 },
  cardHeader:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid #EDE8E0' },
  cardTitle:      { fontSize: 14, fontWeight: 600, color: '#1C1C1E' },
  tableRow:       { display: 'flex', alignItems: 'center', gap: 12, padding: '11px 18px', borderBottom: '1px solid #EDE8E0' },
  rowTitle:       { fontSize: 13, fontWeight: 500, color: '#1C1C1E' },
  rowSub:         { fontSize: 11, color: '#9C9CA0', marginTop: 2 },
  rowAmt:         { fontSize: 13, fontWeight: 700, color: '#0F1923', minWidth: 80, textAlign: 'right' as const },
  avatar:         { width: 34, height: 34, borderRadius: '50%', background: '#EDE8E0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#1C1C1E', flexShrink: 0 },
  filterRow:      { display: 'flex', gap: 4, flexWrap: 'wrap' as const },
  filterBtn:      { padding: '4px 10px', borderRadius: 20, border: '1px solid #EDE8E0', background: '#F7F3EE', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit', color: '#5C5C60' },
  filterBtnActive:{ background: '#C8922A', color: '#fff', border: 'none' },
  actionBtn:      { padding: '5px 10px', borderRadius: 6, border: '1px solid #EDE8E0', background: '#F7F3EE', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', color: '#1C1C1E' },
  primaryBtn:     { padding: '8px 14px', borderRadius: 8, border: 'none', background: '#C8922A', color: '#0F1923', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' },
  label:          { fontSize: 10, color: '#9C9CA0', textTransform: 'uppercase' as const, letterSpacing: 0.5, fontWeight: 600, marginBottom: 4 },
  input:          { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #EDE8E0', fontSize: 13, fontFamily: 'inherit', color: '#1C1C1E', background: '#fff', boxSizing: 'border-box' as const },
  addForm:        { padding: '14px 18px', borderBottom: '1px solid #EDE8E0', display: 'flex', flexDirection: 'column', gap: 8 },
  orderCard:      { border: '1px solid #EDE8E0', borderRadius: 10, margin: '8px 18px', overflow: 'hidden' },
  loginPage:      { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F1923', fontFamily: "'DM Sans', sans-serif" },
  loginCard:      { background: '#fff', borderRadius: 20, padding: 36, width: 380, maxWidth: '90vw' },
  loginLogo:      { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 },
  loginTitle:     { fontSize: 24, fontWeight: 300, color: '#0F1923', marginBottom: 4 },
  loginSub:       { fontSize: 13, color: '#9C9CA0', marginBottom: 24 },
  loginBtn:       { width: '100%', padding: 14, background: '#C8922A', color: '#0F1923', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginTop: 8 },
  loginHint:      { textAlign: 'center' as const, fontSize: 11, color: '#9C9CA0', marginTop: 12 },
  error:          { color: '#E63946', fontSize: 12, marginTop: 4 },
  center:         { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' },
}
