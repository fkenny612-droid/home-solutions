'use client'
import { useState, useEffect, useRef } from 'react'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'https://railway-up-deploy-production.up.railway.app/api/v1'

// Human-readable labels for every service type
const SERVICE_LABELS: Record<string, string> = {
  plumbing: 'Plumbing', electrical: 'Electrical', cleaning: 'Cleaning',
  hvac: 'AC & HVAC', gas: 'Gas', handyman: 'Handyman', painting: 'Painting',
  tiling: 'Tiling', carpentry: 'Carpentry', roofing: 'Roofing',
  bricklaying: 'Bricklaying', solar: 'Solar Install', borehole: 'Borehole',
  septic_tank: 'Septic Tank', dstv: 'DSTV & Satellite', pest_control: 'Pest Control',
  locksmith: 'Locksmith', waterproofing: 'Waterproofing', landscaping: 'Landscaping',
  pool: 'Pool', paving: 'Paving', gate_motor: 'Gate Motor', moving: 'Moving',
  // Event hire
  tent_hire: 'Tent Hire', chair_table_hire: 'Chairs & Tables', decor_hire: 'Décor Hire',
  sound_pa_hire: 'PA & Sound', jumping_castle_hire: 'Jumping Castle',
  catering_equipment_hire: 'Catering Equipment', cold_room_hire: 'Cold Room Hire',
  mobile_toilet_hire: 'Mobile Toilets',
  // Plant & equipment
  generator_hire: 'Generator Hire', water_bowser_hire: 'Water Bowser',
  // Transport
  bakkie_hire: 'Bakkie Hire', van_hire: 'Van Hire', furniture_removal: 'Furniture Removal',
  last_mile_delivery: 'Last-Mile Delivery', livestock_transport: 'Livestock Transport',
  // Security
  security_guard_hire: 'Security Guards', security: 'Alarm & CCTV',
}
const svcLabel = (id: string) => SERVICE_LABELS[id] ?? id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

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
type Section = 'dashboard' | 'bookings' | 'providers' | 'clients' | 'tracking' | 'hardware' | 'materials' | 'finance' | 'settings'

const NAV: { section: string; items: { id: Section; label: string; icon: string }[] }[] = [
  { section: 'Operations', items: [
    { id: 'dashboard',  label: 'Dashboard',  icon: '📊' },
    { id: 'bookings',   label: 'Bookings',   icon: '📋' },
    { id: 'tracking',   label: 'Live Map',   icon: '📍' },
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
          {section === 'tracking'   && <TrackingSection />}
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
                <div style={styles.rowTitle}>{svcLabel(b.serviceType)} · {b.address}</div>
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
                <div style={styles.rowTitle}>{svcLabel(b.serviceType)} — {b.address}</div>
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
            <Detail label="Service"  value={svcLabel(selected.serviceType)} />
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
          <BookingChat bookingId={selected.id} myId="admin-1" myName="Admin" myRole="admin" />
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

            <div style={{ marginTop: 14 }}>
              <div style={styles.label}>Availability</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                {(['monFri','saturday','sunday','emergency'] as const).map(k => {
                  const labels: Record<string, string> = { monFri: 'Mon–Fri', saturday: 'Saturday', sunday: 'Sunday', emergency: '⚡ Emergency' }
                  const on = selected[k]
                  return (
                    <button
                      key={k}
                      style={{ ...styles.actionBtn, background: on ? '#DCF0E8' : '#FEE2E2', color: on ? '#1A5C38' : '#E63946', border: 'none' }}
                      onClick={async () => {
                        await apiFetch(`/providers/${selected.id}/availability`, { method: 'PATCH', body: JSON.stringify({ [k]: !on }) })
                        setSelected((s: any) => ({ ...s, [k]: !on }))
                        setProviders(prev => prev.map(p => p.id === selected.id ? { ...p, [k]: !on } : p))
                      }}
                    >
                      {labels[k]}: {on ? 'ON' : 'OFF'}
                    </button>
                  )
                })}
              </div>
            </div>

            {selected.earningsBalance > 0 && (
              <div style={{ marginTop: 14, padding: 12, background: '#FFFBF0', borderRadius: 8, border: '1px solid #EDE8E0' }}>
                <div style={{ fontSize: 11, color: '#9C9CA0', marginBottom: 4 }}>PENDING WITHDRAWAL</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>R {selected.earningsBalance?.toLocaleString()}</div>
                <button
                  style={{ ...styles.actionBtn, background: '#C8922A', color: '#fff', border: 'none' }}
                  onClick={async () => {
                    if (!confirm(`Mark R ${selected.earningsBalance} as paid out to ${selected.name}?`)) return
                    await apiFetch(`/providers/${selected.id}/withdraw`, { method: 'POST', body: JSON.stringify({ amount: selected.earningsBalance }) })
                    setSelected((s: any) => ({ ...s, earningsBalance: 0 }))
                    setProviders(prev => prev.map(p => p.id === selected.id ? { ...p, earningsBalance: 0 } : p))
                  }}
                >
                  💳 Mark as paid out
                </button>
              </div>
            )}

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

// ─── Booking Chat ─────────────────────────────────────────────────────────────
interface ChatAttachment { url: string; type: 'image' | 'file'; fileName: string }
interface ChatMessage { id: string; senderId: string; senderRole: string; senderName: string; text: string; attachments?: ChatAttachment[]; createdAt: string }

function BookingChat({ bookingId, myId, myName, myRole }: { bookingId: string; myId: string; myName: string; myRole: string }) {
  const [messages,  setMessages]  = useState<ChatMessage[]>([])
  const [text,      setText]      = useState('')
  const [sending,   setSending]   = useState(false)
  const [uploading, setUploading] = useState(false)
  const [pendingAtts, setPendingAtts] = useState<ChatAttachment[]>([])
  const bottomRef  = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = () =>
    apiFetch(`/bookings/${bookingId}/messages`).then(setMessages).catch(() => {})

  useEffect(() => { load() }, [bookingId])
  useEffect(() => { const id = setInterval(load, 3000); return () => clearInterval(id) }, [bookingId])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    try {
      const uploaded: ChatAttachment[] = []
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('upload_preset', 'home_solutions')
        const res = await fetch('https://api.cloudinary.com/v1_1/home-solutions/auto/upload', { method: 'POST', body: formData })
        const data = await res.json()
        if (data.secure_url) {
          uploaded.push({
            url: data.secure_url,
            type: file.type.startsWith('image/') ? 'image' : 'file',
            fileName: file.name,
          })
        }
      }
      setPendingAtts(prev => [...prev, ...uploaded])
    } catch {
      alert('Upload failed — please try again.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const canSend = (text.trim().length > 0 || pendingAtts.length > 0) && !sending && !uploading

  const send = async () => {
    if (!canSend) return
    setSending(true)
    try {
      await apiFetch(`/bookings/${bookingId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ senderId: myId, senderRole: myRole, senderName: myName, text, attachments: pendingAtts }),
      })
      setText('')
      setPendingAtts([])
      await load()
    } finally { setSending(false) }
  }

  const ROLE_COLOR: Record<string, string> = { admin: '#C8922A', provider: '#2D8A6E', client: '#1D4ED8' }

  return (
    <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #EDE8E0', overflow: 'hidden', marginTop: 0 }}>
      <div style={{ padding: '12px 18px', borderBottom: '1px solid #EDE8E0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>💬</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#1C1C1E' }}>Booking Chat</span>
        <span style={{ fontSize: 10, color: '#9C9CA0', marginLeft: 'auto' }}>Polls every 3s</span>
      </div>

      {/* Messages */}
      <div style={{ height: 260, overflowY: 'auto', padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#9C9CA0', fontSize: 12, marginTop: 80 }}>No messages yet — start the conversation</div>
        )}
        {messages.map(m => {
          const isMe = m.senderId === myId
          const atts = m.attachments ?? []
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
              <div style={{ fontSize: 10, color: '#9C9CA0', marginBottom: 3 }}>
                <span style={{ fontWeight: 600, color: ROLE_COLOR[m.senderRole] ?? '#6B7280' }}>{m.senderName}</span>
                {' · '}{m.senderRole}{' · '}{new Date(m.createdAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {/* Attachments */}
                {atts.map((att, i) => att.type === 'image' ? (
                  <a key={i} href={att.url} target="_blank" rel="noreferrer">
                    <img src={att.url} alt={att.fileName} style={{ maxWidth: 220, maxHeight: 165, borderRadius: 10, display: 'block', cursor: 'pointer' }} />
                  </a>
                ) : (
                  <a key={i} href={att.url} target="_blank" rel="noreferrer" style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                    background: isMe ? 'rgba(255,255,255,0.2)' : '#F7F3EE',
                    borderRadius: 10, border: '1px solid #EDE8E0', textDecoration: 'none',
                  }}>
                    <span style={{ fontSize: 18 }}>📄</span>
                    <span style={{ fontSize: 12, color: isMe ? '#fff' : '#1C1C1E', fontWeight: 500 }}>{att.fileName}</span>
                  </a>
                ))}
                {/* Text */}
                {m.text && (
                  <div style={{
                    padding: '8px 12px', borderRadius: isMe ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                    background: isMe ? '#C8922A' : '#F7F3EE',
                    color: isMe ? '#fff' : '#1C1C1E', fontSize: 13, lineHeight: 1.5,
                  }}>
                    {m.text}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Pending attachments preview */}
      {pendingAtts.length > 0 && (
        <div style={{ padding: '8px 14px', borderTop: '1px solid #EDE8E0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {pendingAtts.map((att, i) => (
            <div key={i} style={{ position: 'relative' }}>
              {att.type === 'image'
                ? <img src={att.url} style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover' }} />
                : <div style={{ width: 56, height: 56, borderRadius: 8, background: '#F7F3EE', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 10, gap: 2, padding: 4 }}>
                    <span style={{ fontSize: 20 }}>📄</span>
                    <span style={{ color: '#6B7280', textAlign: 'center', overflow: 'hidden', maxWidth: 50 }}>{att.fileName}</span>
                  </div>}
              <button onClick={() => setPendingAtts(prev => prev.filter((_, j) => j !== i))}
                style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8, background: '#6B7280', border: 'none', color: '#fff', fontSize: 9, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid #EDE8E0', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
        {/* Hidden file input */}
        <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip" style={{ display: 'none' }} onChange={handleFileChange} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{ width: 36, height: 36, borderRadius: 18, background: '#F7F3EE', border: '1px solid #EDE8E0', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: uploading ? 0.5 : 1 }}
          title="Attach photo or file"
        >{uploading ? '⏳' : '＋'}</button>
        <input
          style={{ ...styles.input, flex: 1, margin: 0 }}
          placeholder="Type a message…"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
        />
        <button
          style={{ ...styles.primaryBtn, padding: '8px 16px', opacity: canSend ? 1 : 0.5 }}
          onClick={send}
          disabled={!canSend}
        >
          Send
        </button>
      </div>
    </div>
  )
}

// ─── Live Tracking ────────────────────────────────────────────────────────────
function TrackingSection() {
  const [providers, setProviders] = useState<any[]>([])
  const [bookings,  setBookings]  = useState<any[]>([])
  const [selected,  setSelected]  = useState<any>(null)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const load = () => {
    apiFetch('/providers').then(setProviders).catch(() => {})
    apiFetch('/bookings').then(setBookings).catch(() => {})
    setLastRefresh(new Date())
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 30_000)
    return () => clearInterval(id)
  }, [])

  const activeBookings = bookings.filter(b => ['accepted','en_route','in_progress','emergency'].includes(b.status))
  const onlineProviders = providers.filter(p => p.location?.lat)

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ ...styles.statCard, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 0 }}>
            <span style={{ fontSize: 20 }}>🔧</span>
            <div>
              <div style={{ fontSize: 20, fontWeight: 300, color: '#0F1923' }}>{onlineProviders.length}</div>
              <div style={{ fontSize: 10, color: '#9C9CA0' }}>Providers on map</div>
            </div>
          </div>
          <div style={{ ...styles.statCard, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 0 }}>
            <span style={{ fontSize: 20 }}>📋</span>
            <div>
              <div style={{ fontSize: 20, fontWeight: 300, color: '#0F1923' }}>{activeBookings.length}</div>
              <div style={{ fontSize: 10, color: '#9C9CA0' }}>Active jobs</div>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: '#9C9CA0' }}>Updated {lastRefresh.toLocaleTimeString('en-ZA')}</span>
          <button style={styles.primaryBtn} onClick={load}>↻ Refresh</button>
        </div>
      </div>

      {/* Map + sidebar */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, background: '#fff', borderRadius: 12, border: '1px solid #EDE8E0', overflow: 'hidden' }}>
          <LeafletMap providers={onlineProviders} bookings={activeBookings} onSelect={setSelected} />
        </div>

        {/* Sidebar list */}
        <div style={{ width: 280, flexShrink: 0 }}>
          <Card title={`Active jobs (${activeBookings.length})`}>
            {activeBookings.length === 0 && <Empty text="No active jobs" />}
            {activeBookings.map(b => (
              <div
                key={b.id}
                style={{ ...styles.tableRow, cursor: 'pointer', background: selected?.id === b.id ? '#FFFBF0' : 'transparent' }}
                onClick={() => setSelected(b)}
              >
                <div style={{ flex: 1 }}>
                  <div style={styles.rowTitle}>{svcLabel(b.serviceType)} — {b.address?.split(',')[0]}</div>
                  <div style={styles.rowSub}>#{b.id.slice(-6).toUpperCase()}</div>
                </div>
                <StatusBadge status={b.status} />
              </div>
            ))}
          </Card>

          <Card title={`Providers (${onlineProviders.length})`}>
            {onlineProviders.length === 0 && <Empty text="No providers with location" />}
            {onlineProviders.map(p => (
              <div
                key={p.id}
                style={{ ...styles.tableRow, cursor: 'pointer', background: selected?.id === p.id ? '#FFFBF0' : 'transparent' }}
                onClick={() => setSelected(p)}
              >
                <Avatar name={p.name} />
                <div style={{ flex: 1 }}>
                  <div style={styles.rowTitle}>{p.name}</div>
                  <div style={styles.rowSub}>{p.skills?.join(', ')}</div>
                </div>
                <StatusBadge status={p.status} />
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div style={{ marginTop: 16 }}>
          <Card title={selected.name ?? `Booking #${selected.id?.slice(-6).toUpperCase()}`} action={<CloseBtn onClick={() => setSelected(null)} />}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              {selected.serviceType
                ? <>
                    <Detail label="Service"  value={svcLabel(selected.serviceType)} />
                    <Detail label="Status"   value={<StatusBadge status={selected.status} />} />
                    <Detail label="Address"  value={selected.address} />
                    <Detail label="Provider" value={selected.providerId ?? 'Unassigned'} />
                    <Detail label="Quoted"   value={`R ${selected.quotedAmount?.toLocaleString()}`} />
                  </>
                : <>
                    <Detail label="Phone"   value={selected.phone} />
                    <Detail label="Status"  value={<StatusBadge status={selected.status} />} />
                    <Detail label="Skills"  value={selected.skills?.join(', ')} />
                    <Detail label="Rating"  value={`★ ${selected.rating}`} />
                    <Detail label="Lat/Lng" value={`${selected.location?.lat?.toFixed(4)}, ${selected.location?.lng?.toFixed(4)}`} />
                  </>
              }
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

// ─── Leaflet Map (dynamic — no SSR) ──────────────────────────────────────────
function LeafletMap({ providers, bookings, onSelect }: {
  providers: any[]
  bookings: any[]
  onSelect: (item: any) => void
}) {
  const mapRef    = useRef<any>(null)
  const mapElRef  = useRef<HTMLDivElement>(null)
  const markersRef = useRef<any[]>([])

  useEffect(() => {
    if (typeof window === 'undefined') return

    import('leaflet').then(L => {
      // Fix default icon paths broken by webpack
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      if (!mapRef.current && mapElRef.current) {
        mapRef.current = L.map(mapElRef.current, {
          center: [-29.8587, 31.0218], // Durban
          zoom: 12,
        })
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(mapRef.current)
      }

      const map = mapRef.current
      if (!map) return

      // Clear old markers
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []

      // Provider markers — orange wrench
      providers.forEach(p => {
        if (!p.location?.lat) return
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:32px;height:32px;background:#C8922A;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)">🔧</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        })
        const m = L.marker([p.location.lat, p.location.lng], { icon })
          .addTo(map)
          .bindPopup(`<strong>${p.name}</strong><br/>${p.skills?.join(', ')}<br/><span style="color:#2D8A6E">● ${p.status}</span>`)
        m.on('click', () => onSelect(p))
        markersRef.current.push(m)
      })

      // Booking markers — red pin for emergency, blue for others
      bookings.forEach(b => {
        const loc = parseLocation(b.location)
        if (!loc) return
        const isEmergency = b.status === 'emergency'
        const icon = L.divIcon({
          className: '',
          html: `<div style="width:28px;height:28px;background:${isEmergency ? '#E63946' : '#1D4ED8'};border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 28],
        })
        const m = L.marker([loc.lat, loc.lng], { icon })
          .addTo(map)
          .bindPopup(`<strong>${svcLabel(b.serviceType)}</strong><br/>${b.address}<br/><span style="color:${isEmergency ? '#E63946' : '#1D4ED8'}">● ${b.status.replace(/_/g,' ')}</span>`)
        m.on('click', () => onSelect(b))
        markersRef.current.push(m)
      })
    })

    // Inject Leaflet CSS once
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id   = 'leaflet-css'
      link.rel  = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providers, bookings])

  return <div ref={mapElRef} style={{ height: 520, width: '100%' }} />
}

/** Parse "lat,lng" string or return null */
function parseLocation(raw: string | null): { lat: number; lng: number } | null {
  if (!raw) return null
  const parts = raw.split(',').map(Number)
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return { lat: parts[0], lng: parts[1] }
  return null
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
