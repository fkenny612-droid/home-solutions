'use client'

import { useState, useEffect } from 'react'
import { STATS, BOOKINGS, PROVIDERS, SUBSCRIPTIONS, REVENUE_BARS } from '@/lib/mock-data'
import { bookings as bookingsApi, providers as providersApi, subscriptions as subsApi } from '@/lib/api'
import type { BookingStats, Provider, Booking } from '@/lib/api'

type AdminModal = null | 'booking' | 'verify-provider' | 'payout' | 'new-booking' | 'report'

const NAV_ITEMS = [
  { section: 'Operations', items: [
    { label: 'Dashboard', icon: 'ti-layout-dashboard' },
    { label: 'Bookings', icon: 'ti-calendar-check', badge: 4 },
    { label: 'Dispatch', icon: 'ti-map-pin' },
    { label: 'Emergency', icon: 'ti-alert-triangle', badge: 1 },
  ]},
  { section: 'Business', items: [
    { label: 'Providers', icon: 'ti-tools' },
    { label: 'Clients', icon: 'ti-users' },
    { label: 'Subscriptions', icon: 'ti-credit-card' },
    { label: 'Payments', icon: 'ti-currency-rand' },
  ]},
  { section: 'System', items: [
    { label: 'Analytics', icon: 'ti-chart-bar' },
    { label: 'Settings', icon: 'ti-settings' },
  ]},
]

const MODAL_CONTENT: Record<string, { title: string; body: string }> = {
  'verify-provider': {
    title: 'Verify Pending Providers',
    body: '3 providers awaiting KYC review.\n\n• Siphamandla Zulu — Plumber — docs uploaded ✓\n• Nomsa Khumalo — Cleaner — ID verified ✓\n• Trevor Smith — Electrician — cert pending ⚠️',
  },
  payout: {
    title: 'Process Technician Payouts',
    body: 'Total pending: R 84 220\n\n12 providers with completed jobs awaiting settlement. Peach Payments split-pay batch will be initiated. Processing time: 1–2 business days.',
  },
  'new-booking': {
    title: 'Create New Booking',
    body: 'Manually create a booking, assign a service category, select a client account, and dispatch the nearest available technician. Use for phone-in and estate manager requests.',
  },
  report: {
    title: 'Generate Weekly Report',
    body: 'PDF summary includes:\n\n• Total bookings & completion rate\n• Revenue breakdown by region\n• Provider performance rankings\n• Subscription growth\n• KZN regional heatmap',
  },
}

export default function AdminSection() {
  const [activeNav, setActiveNav] = useState('Dashboard')
  const [activeTab, setActiveTab] = useState('All')
  const [modal, setModal] = useState<AdminModal>(null)
  const [modalClosing, setModalClosing] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState(BOOKINGS[0])

  const closeModal = () => {
    setModalClosing(true)
    setTimeout(() => { setModal(null); setModalClosing(false) }, 150)
  }

  // This section renders on the public marketing homepage and never authenticates,
  // so the live-data calls below always 401 (bookings/providers require a JWT) and
  // this always falls back to the static demo numbers from '@/lib/mock-data' — by
  // design, so anonymous visitors never see real customer data here.
  const [apiStats,     setApiStats]     = useState<BookingStats | null>(null)
  const [apiProviders, setApiProviders] = useState<Provider[] | null>(null)
  const [apiBookings,  setApiBookings]  = useState<Booking[] | null>(null)
  const [mrr,          setMrr]          = useState<{ total: number; basicHome: { count: number }; premiumHome: { count: number }; estateBiz: { count: number } } | null>(null)

  useEffect(() => {
    bookingsApi.stats().then(setApiStats).catch(() => {})
    providersApi.list('active').then(setApiProviders).catch(() => {})
    bookingsApi.list().then(all => setApiBookings(all.slice(0, 10))).catch(() => {})
    subsApi.mrr().then(setMrr).catch(() => {})

    const id = setInterval(() => {
      bookingsApi.stats().then(setApiStats).catch(() => {})
      bookingsApi.list().then(all => setApiBookings(all.slice(0, 10))).catch(() => {})
    }, 30_000)
    return () => clearInterval(id)
  }, [])

  const liveStats = apiStats
    ? [
        { label: 'Active bookings', val: apiStats.active, change: '↑ +12% today', up: true },
        { label: 'Techs live', val: apiProviders?.length ?? STATS.techsLive, change: '↑ en route', up: true },
        { label: 'Revenue today', val: apiStats.revenueToday > 0 ? `R${(apiStats.revenueToday / 1000).toFixed(1)}k` : STATS.revenueToday, change: '↑ +8% vs yesterday', up: true },
        { label: 'Avg rating', val: STATS.avgRating, change: '↓ −0.1 this week', up: false },
      ]
    : [
        { label: 'Active bookings', val: STATS.activeBookings, change: '↑ +12% today', up: true },
        { label: 'Techs live', val: STATS.techsLive, change: '↑ 18 en route', up: true },
        { label: 'Revenue today', val: STATS.revenueToday, change: '↑ +8% vs yesterday', up: true },
        { label: 'Avg rating', val: STATS.avgRating, change: '↓ −0.1 this week', up: false },
      ]

  const displayBookings = apiBookings ?? BOOKINGS
  const filteredBookings = activeTab === 'All'
    ? displayBookings
    : displayBookings.filter((b: any) =>
        activeTab === 'Live'      ? ['accepted','en_route','in_progress'].includes(b.status) :
        activeTab === 'Pending'   ? b.status === 'pending' :
        activeTab === 'Emergency' ? b.status === 'emergency' :
        true
      )

  return (
    <div style={{ padding: 32 }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Admin web portal</div>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: '#fff', marginBottom: 8 }}>Operations dashboard</div>
      </div>

      {/* Admin shell */}
      <div style={{ display: 'flex', height: 700, overflow: 'hidden', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 40px 80px rgba(0,0,0,0.6)' }}>
        {/* Sidebar */}
        <nav style={{ width: 200, background: 'var(--navy)', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Logo */}
          <div style={{ padding: '16px 16px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="ti ti-home-2" style={{ color: 'var(--navy)', fontSize: 16 }} />
            </div>
            <div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 13, color: '#fff', lineHeight: 1.2 }}>Easyfix</div>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.5, textTransform: 'uppercase' }}>Admin</div>
            </div>
          </div>

          {/* Nav items */}
          {NAV_ITEMS.map(group => (
            <div key={group.section}>
              <div style={{ padding: '12px 10px 6px', fontSize: 9, color: 'rgba(255,255,255,0.28)', letterSpacing: 1.5, textTransform: 'uppercase' }}>{group.section}</div>
              {group.items.map(item => (
                <div
                  key={item.label}
                  onClick={() => setActiveNav(item.label)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
                    borderRadius: 7, margin: '1px 7px', cursor: 'pointer',
                    background: activeNav === item.label ? 'rgba(202,138,4,0.18)' : 'transparent',
                    color: activeNav === item.label ? 'var(--gold-light)' : 'rgba(255,255,255,0.5)',
                    fontSize: 12, transition: 'all 0.15s',
                  }}
                >
                  <i className={`ti ${item.icon}`} style={{ fontSize: 15, width: 16, textAlign: 'center' }} />
                  {item.label}
                  {'badge' in item && item.badge && (
                    <span style={{ marginLeft: 'auto', background: 'var(--red)', color: '#fff', borderRadius: 20, fontSize: 9, padding: '1px 5px', fontWeight: 500 }}>{item.badge}</span>
                  )}
                </div>
              ))}
            </div>
          ))}

          {/* Footer */}
          <div style={{ marginTop: 'auto', padding: 12, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: 'var(--navy)' }}>AS</div>
            <div>
              <p style={{ fontSize: 11, color: '#fff', fontWeight: 500 }}>Admin</p>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>Super Admin</span>
            </div>
          </div>
        </nav>

        {/* Main content */}
        <div className="slim-scroll" style={{ flex: 1, overflowY: 'auto', background: 'var(--cream)', display: 'flex', flexDirection: 'column' }}>
          {/* Topbar */}
          <div style={{ padding: '13px 20px', background: '#fff', borderBottom: '1px solid var(--cream-mid)', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 10 }}>
            <div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, color: 'var(--navy)' }}>{activeNav === 'Dashboard' ? 'Operations Dashboard' : activeNav}</div>
              <div style={{ fontSize: 10, color: 'var(--text-light)', marginTop: 1 }}>Live — Durban & KZN Region</div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              {['ti-bell', 'ti-search'].map(ic => (
                <div key={ic} style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid var(--cream-mid)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', position: 'relative' }}>
                  <i className={`ti ${ic}`} style={{ fontSize: 15 }} />
                  {ic === 'ti-bell' && <span style={{ position: 'absolute', top: 5, right: 5, width: 5, height: 5, borderRadius: '50%', background: 'var(--red)', border: '1.5px solid #fff' }} />}
                </div>
              ))}
              <button onClick={() => setModal('new-booking')} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--gold)', color: 'var(--navy)', border: 'none', padding: '7px 12px', borderRadius: 7, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                <i className="ti ti-plus" /> New Booking
              </button>
            </div>
          </div>

          <div style={{ padding: '16px 20px' }}>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
              {liveStats.map(s => (
                <div key={s.label} style={{ background: '#fff', borderRadius: 10, padding: '13px 14px', border: '1px solid var(--cream-mid)' }}>
                  <div style={{ fontSize: 9, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 }}>{s.label}</div>
                  <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, fontWeight: 300, color: 'var(--navy)' }}>{s.val}</div>
                  <div style={{ fontSize: 10, marginTop: 3, color: s.up ? 'var(--accent)' : 'var(--red)' }}>{s.change}</div>
                </div>
              ))}
            </div>

            {/* Two-col */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 10, marginBottom: 12 }}>
              {/* Bookings card */}
              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--cream-mid)', overflow: 'hidden' }}>
                <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--cream-mid)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>Live Bookings</div>
                  <div style={{ fontSize: 10, color: 'var(--gold)', cursor: 'pointer' }}>View all</div>
                </div>
                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--cream-mid)', padding: '0 14px' }}>
                  {['All', 'Live', 'Pending', 'Emergency'].map(t => (
                    <div
                      key={t}
                      onClick={() => setActiveTab(t)}
                      style={{ padding: '9px 11px', fontSize: 11, fontWeight: 500, cursor: 'pointer', color: activeTab === t ? 'var(--gold)' : 'var(--text-light)', borderBottom: activeTab === t ? '2px solid var(--gold)' : '2px solid transparent' }}
                    >{t}</div>
                  ))}
                </div>
                {filteredBookings.length === 0 && (
                  <div style={{ padding: '24px 14px', textAlign: 'center', fontSize: 12, color: 'var(--text-light)' }}>No bookings in this category</div>
                )}
                {filteredBookings.map((b: any) => {
                  const isLive = apiBookings !== null
                  const service = isLive ? b.serviceType?.replace(/_/g, ' ') : b.service
                  const location = isLive ? b.address : b.location
                  const status = b.status
                  const pillStatus = ['accepted','en_route','in_progress'].includes(status) ? 'live' : status
                  const ago = isLive ? new Date(b.createdAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) : b.ago
                  return (
                    <div
                      key={b.id}
                      onClick={() => { setSelectedBooking(b); setModal('booking') }}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--cream-mid)', cursor: 'pointer', transition: 'background 0.1s' }}
                    >
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 15 }}>
                        {isLive ? '🔧' : <i className={`ti ti-${b.icon}`} style={{ color: b.iconColor }} />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', textTransform: 'capitalize' }}>{service} — {location}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-light)', marginTop: 1 }}>#{b.id.slice(-6).toUpperCase()} · {ago}{!isLive && b.tech ? ` · ${b.tech}` : ''}</div>
                      </div>
                      <span className={`pill pill-${pillStatus}`} style={{ textTransform: 'capitalize' }}>{status.replace(/_/g, ' ')}</span>
                    </div>
                  )
                })}
              </div>

              {/* Right column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Dispatch map */}
                <div style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--cream-mid)', overflow: 'hidden' }}>
                  <div style={{ padding: '9px 12px', borderBottom: '1px solid var(--cream-mid)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>Live Dispatch — KZN</div>
                    <div style={{ fontSize: 10, color: 'var(--gold)', cursor: 'pointer' }}>Full map</div>
                  </div>
                  <div style={{ background: 'var(--navy-mid)', height: 200, position: 'relative', overflow: 'hidden' }}>
                    <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
                      <defs>
                        <pattern id="mg" width="25" height="25" patternUnits="userSpaceOnUse">
                          <path d="M25 0L0 0 0 25" fill="none" stroke="#fff" strokeWidth="0.25" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#mg)" opacity="0.07" />
                      <path d="M30 120Q120 80 210 120Q275 148 320 90" stroke="#fff" strokeWidth="1.2" fill="none" opacity="0.18" />
                    </svg>
                    {[{ x: 26, y: 20, c: '#3BB88F' }, { x: 53, y: 38, c: '#3BB88F' }, { x: 70, y: 17, c: '#E63946' }, { x: 40, y: 63, c: '#F59E0B' }, { x: 16, y: 53, c: '#3BB88F' }].map((d, i) => (
                      <div key={i} style={{ position: 'absolute', left: `${d.x}%`, top: `${d.y}%` }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: d.c, border: `2.5px solid #fff` }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: '9px 14px', display: 'flex', gap: 12, fontSize: 10, color: 'var(--text-muted)' }}>
                    {[{ c: '#3BB88F', label: 'Active' }, { c: '#E63946', label: 'Emergency' }, { c: '#F59E0B', label: 'En route' }].map(l => (
                      <span key={l.label}><span style={{ width: 7, height: 7, borderRadius: '50%', background: l.c, display: 'inline-block', marginRight: 3 }} />{l.label}</span>
                    ))}
                  </div>
                </div>

                {/* Top providers */}
                <div style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--cream-mid)', overflow: 'hidden' }}>
                  <div style={{ padding: '9px 12px', borderBottom: '1px solid var(--cream-mid)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>Top Providers</div>
                    <div style={{ fontSize: 10, color: 'var(--gold)', cursor: 'pointer' }}>Manage</div>
                  </div>
                  {(apiProviders ?? PROVIDERS).slice(0, 5).map((p: any) => {
                    const isLive = apiProviders !== null
                    const name     = isLive ? p.name : p.name
                    const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                    const role     = isLive ? (p.skills?.[0] ?? 'Provider') : p.role
                    const jobs     = isLive ? p.jobCount : p.jobs
                    const rating   = isLive ? Math.round(p.rating) : p.rating
                    const dotColor = isLive
                      ? (p.status === 'active' ? '#3BB88F' : '#F59E0B')
                      : (p.status === 'active' ? '#3BB88F' : p.status === 'emergency' ? '#E63946' : '#F59E0B')
                    return (
                      <div key={p.id ?? p.name} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 14px', borderBottom: '1px solid var(--cream-mid)', cursor: 'pointer' }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#DCF0E8', color: '#1A6842', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{initials}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 500 }}>{name}</div>
                          <div style={{ fontSize: 10, color: 'var(--text-light)', textTransform: 'capitalize' }}>{role} · {jobs} jobs</div>
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--gold)' }}>{'★'.repeat(rating)}{'☆'.repeat(Math.max(0, 5 - rating))}</div>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, marginLeft: 8 }} />
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Bottom row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {/* Subscriptions */}
              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--cream-mid)', overflow: 'hidden' }}>
                <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--cream-mid)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>Subscriptions</div>
                  <div style={{ fontSize: 10, color: 'var(--gold)', cursor: 'pointer' }}>Details</div>
                </div>
                <div style={{ padding: 14 }}>
                  {(mrr ? [
                    { label: 'Basic Home',        count: mrr.basicHome.count,   pct: Math.min(100, Math.round(mrr.basicHome.count / 20)),   color: '#CA8A04' },
                    { label: 'Premium Home',       count: mrr.premiumHome.count, pct: Math.min(100, Math.round(mrr.premiumHome.count / 20)), color: '#2D8A6E' },
                    { label: 'Estate / Biz',       count: mrr.estateBiz.count,   pct: Math.min(100, Math.round(mrr.estateBiz.count / 20)),   color: '#243447' },
                  ] : SUBSCRIPTIONS).map(s => (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9, fontSize: 11 }}>
                      <div style={{ width: 90, color: 'var(--text-muted)', flexShrink: 0, fontSize: 10 }}>{s.label}</div>
                      <div style={{ flex: 1, height: 6, background: 'var(--cream-mid)', borderRadius: 20, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${s.pct}%`, background: s.color, borderRadius: 20 }} />
                      </div>
                      <div style={{ width: 32, textAlign: 'right', fontWeight: 500, flexShrink: 0, fontSize: 10 }}>{s.count.toLocaleString()}</div>
                    </div>
                  ))}
                  <div style={{ marginTop: 9, paddingTop: 9, borderTop: '1px solid var(--cream-mid)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Total subscribers</span>
                      <span style={{ fontWeight: 500 }}>{mrr ? (mrr.basicHome.count + mrr.premiumHome.count + mrr.estateBiz.count).toLocaleString() : '2 642'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 3 }}>
                      <span style={{ color: 'var(--text-muted)' }}>Monthly MRR</span>
                      <span style={{ fontWeight: 500, color: 'var(--accent)' }}>{mrr ? `R ${(mrr.total / 1000).toFixed(0)}k` : 'R 398 140'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Revenue + Quick actions */}
              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid var(--cream-mid)', overflow: 'hidden' }}>
                <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--cream-mid)' }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>Revenue — 7 days</div>
                </div>
                <div style={{ padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 70 }}>
                    {REVENUE_BARS.map(b => (
                      <div
                        key={b.day}
                        title={`${b.day} ${b.amount}`}
                        style={{ flex: 1, height: `${b.pct}%`, borderRadius: '3px 3px 0 0', background: b.highlight ? 'var(--accent)' : 'var(--gold)', opacity: b.highlight ? 1 : 0.65, cursor: 'pointer', transition: 'opacity 0.15s' }}
                      />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 5, marginTop: 3 }}>
                    {REVENUE_BARS.map(b => (
                      <div key={b.day} style={{ flex: 1, fontSize: 8, color: b.highlight ? 'var(--accent)' : 'var(--text-light)', textAlign: 'center' }}>{b.day}</div>
                    ))}
                  </div>
                </div>
                <div style={{ padding: '0 14px 4px', fontSize: 11, fontWeight: 500, color: 'var(--text)' }}>Quick actions</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 14px 14px' }}>
                  {[
                    { icon: 'ti-user-check', label: 'Verify provider', sub: '3 pending', key: 'verify-provider' },
                    { icon: 'ti-cash', label: 'Process payout', sub: 'R 84 220 due', key: 'payout' },
                    { icon: 'ti-calendar-plus', label: 'New booking', sub: 'Manual assign', key: 'new-booking' },
                    { icon: 'ti-file-analytics', label: 'Generate report', sub: 'Weekly PDF', key: 'report' },
                  ].map(qa => (
                    <button
                      key={qa.key}
                      onClick={() => setModal(qa.key as AdminModal)}
                      style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '10px 11px', borderRadius: 8, border: '1px solid var(--cream-mid)', background: 'var(--cream)', cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left', fontFamily: "'DM Sans', sans-serif" }}
                    >
                      <i className={`ti ${qa.icon}`} style={{ fontSize: 16, color: 'var(--gold)' }} />
                      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text)' }}>{qa.label}</span>
                      <small style={{ fontSize: 9, color: 'var(--text-light)' }}>{qa.sub}</small>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking modal */}
      {modal === 'booking' && selectedBooking && (
        <div onClick={(e) => e.target === e.currentTarget && closeModal()} className={`modal-overlay-anim ${modalClosing ? 'closing' : ''}`}>
          <div className="modal-panel-anim" style={{ background: '#fff', borderRadius: 16, padding: 22, width: 380, maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, color: 'var(--navy)', marginBottom: 4 }}>Booking {selectedBooking.id}</div>
                <span className={`pill pill-${selectedBooking.status}`} style={{ textTransform: 'capitalize' }}>{selectedBooking.status}</span>
              </div>
              <span onClick={closeModal} className="press" style={{ cursor: 'pointer', color: 'var(--text-light)', fontSize: 18, lineHeight: 1 }}>
                <i className="ti ti-x" />
              </span>
            </div>
            {[
              { label: 'Service', val: selectedBooking.service },
              { label: 'Client', val: `${selectedBooking.client} · ${selectedBooking.plan}` },
              { label: 'Location', val: selectedBooking.location },
              { label: 'Technician', val: selectedBooking.tech ? `${selectedBooking.tech}${selectedBooking.eta ? ` — ETA ${selectedBooking.eta}` : ''}` : 'Unassigned' },
              { label: 'Quoted', val: `${selectedBooking.quoted} (approved)` },
              { label: 'Payment', val: `${selectedBooking.quoted} — held`, green: true },
              { label: 'Warranty', val: '90-day parts & labour' },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', gap: 9, marginBottom: 10, fontSize: 12 }}>
                <span style={{ color: 'var(--text-light)', width: 100, flexShrink: 0 }}>{r.label}</span>
                <span style={{ color: r.green ? 'var(--accent)' : 'var(--text)', fontWeight: 500 }}>{r.val}</span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 7, marginTop: 16 }}>
              <button onClick={closeModal} className="press" style={{ flex: 1, padding: 9, borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", border: '1px solid var(--cream-mid)', background: '#fff', color: 'var(--text)' }}>Message client</button>
              <button className="press" style={{ flex: 1, padding: 9, borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", border: 'none', background: '#DCF0E8', color: '#1A6842' }}>Mark complete</button>
              <button onClick={closeModal} className="press" style={{ flex: 1, padding: 9, borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", border: 'none', background: '#FEE2E2', color: 'var(--red)' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Action modals */}
      {modal && modal !== 'booking' && MODAL_CONTENT[modal] && (
        <div onClick={(e) => e.target === e.currentTarget && closeModal()} className={`modal-overlay-anim ${modalClosing ? 'closing' : ''}`}>
          <div className="modal-panel-anim" style={{ background: '#fff', borderRadius: 16, padding: 22, width: 380, maxWidth: '90vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, color: 'var(--navy)' }}>{MODAL_CONTENT[modal].title}</div>
              <span onClick={closeModal} className="press" style={{ cursor: 'pointer', color: 'var(--text-light)', fontSize: 18 }}><i className="ti ti-x" /></span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{MODAL_CONTENT[modal].body}</div>
            <div style={{ display: 'flex', gap: 7, marginTop: 16 }}>
              <button onClick={closeModal} className="press" style={{ flex: 1, padding: 9, borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", border: '1px solid var(--cream-mid)', background: '#fff', color: 'var(--text)' }}>Cancel</button>
              <button onClick={closeModal} className="press" style={{ flex: 2, padding: 9, borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", border: 'none', background: 'var(--gold)', color: 'var(--navy)' }}>
                <i className="ti ti-check" style={{ marginRight: 5 }} />Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
