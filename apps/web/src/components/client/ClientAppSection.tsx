'use client'

import { useState, useEffect, useRef } from 'react'
import PhoneFrame from '@/components/ui/PhoneFrame'
import { SERVICES } from '@/lib/mock-data'

type View = 'home' | 'providers' | 'quote' | 'tracking' | 'rating' | 'done'

const PROVIDER_TITLE: Record<string, string> = {
  // Home trades
  plumbing: 'Plumbers near you', electrical: 'Electricians near you',
  cleaning: 'Cleaners near you', hvac: 'HVAC techs near you',
  gas: 'Gas techs near you', handyman: 'Handymen near you',
  painting: 'Painters near you', tiling: 'Tilers near you',
  carpentry: 'Carpenters near you', roofing: 'Roofers near you',
  bricklaying: 'Bricklayers near you', solar: 'Solar installers near you',
  borehole: 'Borehole specialists near you', septic_tank: 'Septic tank services near you',
  dstv: 'DSTV installers near you', pest_control: 'Pest control near you',
  locksmith: 'Locksmiths near you', waterproofing: 'Waterproofers near you',
  // Event hire
  tent_hire: 'Tent hire near you', chair_table_hire: 'Chair & table hire near you',
  decor_hire: 'Décor hire near you', sound_pa_hire: 'PA & sound hire near you',
  jumping_castle_hire: 'Jumping castles near you', catering_equipment_hire: 'Catering equipment near you',
  cold_room_hire: 'Cold room hire near you', mobile_toilet_hire: 'Mobile toilet hire near you',
  // Plant & equipment
  generator_hire: 'Generator hire near you', water_bowser_hire: 'Water bowsers near you',
  // Transport
  bakkie_hire: 'Bakkie hire near you', van_hire: 'Van hire near you',
  furniture_removal: 'Removal services near you', last_mile_delivery: 'Delivery services near you',
  livestock_transport: 'Livestock transport near you',
  // Security
  security_guard_hire: 'Security companies near you', security: 'Alarm & CCTV installers near you',
  emergency: 'Emergency dispatch',
}

export default function ClientAppSection() {
  const [view, setView] = useState<View>('home')
  const [serviceType, setServiceType] = useState('plumbing')
  const [selectedProv, setSelectedProv] = useState(1)
  const [rating, setRating] = useState(5)
  const [ratingTags, setRatingTags] = useState(['Punctual', 'Professional', 'Friendly'])
  const [techPos, setTechPos] = useState({ x: 16, y: 60 })
  const [eta, setEta] = useState(12)
  const trackInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  function goto(v: View, type?: string) {
    setView(v)
    if (type) setServiceType(type)
    if (v === 'tracking') startTracking()
    else stopTracking()
  }

  function startTracking() {
    stopTracking()
    let pos = { x: 16, y: 60 }
    let e = 12
    setTechPos(pos)
    setEta(e)
    trackInterval.current = setInterval(() => {
      pos = { x: pos.x + (60 - pos.x) * 0.04, y: pos.y + (33 - pos.y) * 0.04 }
      e = e > 1 ? e - 0.15 : 1
      setTechPos({ ...pos })
      setEta(e)
    }, 300)
  }

  function stopTracking() {
    if (trackInterval.current) clearInterval(trackInterval.current)
  }

  useEffect(() => () => stopTracking(), [])

  const toggleTag = (tag: string) =>
    setRatingTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])

  return (
    <div style={{ padding: 32 }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Client mobile app</div>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: '#fff', marginBottom: 8 }}>Full booking journey</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Tap any service card to walk through the complete flow</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <PhoneFrame label="iOS / Android">
          {view === 'home' && <HomeView onService={(id) => goto('providers', id)} />}
          {view === 'providers' && (
            <ProvidersView
              title={PROVIDER_TITLE[serviceType] || 'Providers near you'}
              selected={selectedProv}
              onSelect={setSelectedProv}
              onBack={() => goto('home')}
              onNext={() => goto('quote')}
            />
          )}
          {view === 'quote' && <QuoteView onBack={() => goto('providers')} onApprove={() => goto('tracking')} />}
          {view === 'tracking' && (
            <TrackingView
              techPos={techPos}
              eta={Math.round(eta)}
              onBack={() => goto('providers')}
              onComplete={() => goto('rating')}
            />
          )}
          {view === 'rating' && (
            <RatingView
              rating={rating}
              tags={ratingTags}
              onRating={setRating}
              onTagToggle={toggleTag}
              onSubmit={() => goto('done')}
            />
          )}
          {view === 'done' && <DoneView onHome={() => goto('home')} />}
        </PhoneFrame>
      </div>
    </div>
  )
}

/* ── Sub-views ── */

function HomeView({ onService }: { onService: (id: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: 'var(--navy)', padding: '18px 18px 24px', color: '#fff' }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 2 }}>Good morning,</div>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, marginBottom: 12 }}>Priya Govender</div>
        <div style={{ background: 'rgba(200,146,42,0.2)', border: '1px solid rgba(200,146,42,0.4)', borderRadius: 20, padding: '4px 11px', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--gold-light)' }}>
          <i className="ti ti-crown" style={{ fontSize: 11 }} /> Premium Home · Active
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: 14, background: 'var(--cream)' }}>
        <div style={{ fontSize: 10, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontWeight: 500 }}>Book a service</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
          {SERVICES.map(s => (
            <div
              key={s.id}
              onClick={() => onService(s.id)}
              style={{ background: '#fff', borderRadius: 10, padding: '12px 8px', textAlign: 'center', cursor: 'pointer', border: '1px solid var(--cream-mid)', transition: 'all 0.15s' }}
            >
              <div style={{ fontSize: 20 }}><i className={s.iconClass} style={{ color: s.color }} /></div>
              <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--text)', marginTop: 4 }}>{s.label}</div>
              <div style={{ fontSize: 9, color: 'var(--text-light)', marginTop: 1 }}>{s.price}</div>
            </div>
          ))}
        </div>

        {/* Emergency */}
        <div
          onClick={() => onService('emergency')}
          style={{ background: 'var(--red)', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 14 }}
        >
          <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.15)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="ti ti-alert-triangle" style={{ color: '#fff', fontSize: 18 }} />
          </div>
          <div style={{ color: '#fff', flex: 1 }}>
            <div style={{ fontWeight: 500, fontSize: 12 }}>Emergency callout</div>
            <div style={{ fontSize: 10, opacity: 0.7, marginTop: 1 }}>Nearest tech in &lt;15 min</div>
          </div>
          <i className="ti ti-arrow-right" style={{ color: 'rgba(255,255,255,0.5)' }} />
        </div>

        <div style={{ fontSize: 10, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, fontWeight: 500 }}>Recent jobs</div>
        {[
          { icon: 'ti-bolt', bg: '#FEF3C7', color: '#D97706', name: 'Electrical — DB board', date: '15 May · Kevin M. · ★★★★★', amt: 'R 850' },
          { icon: 'ti-droplet', bg: '#DBEAFE', color: '#1D4ED8', name: 'Plumbing — Geyser', date: '2 May · Raj P. · ★★★★☆', amt: 'R 2 200' },
        ].map(h => (
          <div key={h.name} style={{ background: '#fff', borderRadius: 9, padding: '10px 12px', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--cream-mid)', cursor: 'pointer' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: h.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={`ti ${h.icon}`} style={{ color: h.color }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{h.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text-light)', marginTop: 1 }}>{h.date}</div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--accent)', flexShrink: 0 }}>{h.amt}</div>
          </div>
        ))}
      </div>

      {/* Bottom nav */}
      <div style={{ background: '#fff', borderTop: '1px solid var(--cream-mid)', padding: '7px 0 10px', display: 'flex' }}>
        {[{ icon: 'ti-home-2', label: 'Home', active: true }, { icon: 'ti-calendar', label: 'Bookings' }, { icon: 'ti-clock-history', label: 'History' }, { icon: 'ti-user', label: 'Profile' }].map(t => (
          <div key={t.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, cursor: 'pointer', color: t.active ? 'var(--gold)' : 'var(--text-light)' }}>
            <i className={`ti ${t.icon}`} style={{ fontSize: 18 }} />
            <span style={{ fontSize: 8, fontWeight: 500 }}>{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProgressHeader({ pct, title, sub, onBack }: { pct: number; title: string; sub?: string; onBack: () => void }) {
  return (
    <>
      <div style={{ height: 3, background: 'var(--cream-mid)' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--gold)', transition: 'width 0.4s ease' }} />
      </div>
      <div style={{ padding: '12px 14px', background: '#fff', borderBottom: '1px solid var(--cream-mid)', display: 'flex', alignItems: 'center', gap: 9 }}>
        <button
          onClick={onBack}
          style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--cream-mid)', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}
        >
          <i className="ti ti-arrow-left" />
        </button>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{title}</div>
          {sub && <div style={{ fontSize: 10, color: 'var(--text-light)' }}>{sub}</div>}
        </div>
      </div>
    </>
  )
}

function ProvidersView({ title, selected, onSelect, onBack, onNext }: { title: string; selected: number; onSelect: (n: number) => void; onBack: () => void; onNext: () => void }) {
  const providers = [
    { n: 1, initials: 'RP', name: 'Raj Pillay', skill: 'Master Plumber · 8 yrs', stars: '★★★★★', rating: '4.9 (214)', eta: '~12 min', tags: ['PIRB cert', 'Geyser spec.', 'Insured'], dist: '1.4km', jobs: '892 jobs', bg: '#DCF0E8', fg: '#1A6842' },
    { n: 2, initials: 'SN', name: 'Sipho Ndlovu', skill: 'Plumber · 5 yrs', stars: '★★★★☆', rating: '4.7 (98)', eta: '~18 min', tags: ['PIRB cert', 'Background ✓'], dist: '2.1km', jobs: '312 jobs', bg: '#DBEAFE', fg: '#1D4ED8' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <ProgressHeader pct={33} title={title} sub="Glenwood, Durban · 3 available" onBack={onBack} />
      <div style={{ padding: 14, background: 'var(--cream)', flex: 1 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>Sorted by rating · Verified only</div>
        {providers.map(p => (
          <div
            key={p.n}
            onClick={() => onSelect(p.n)}
            style={{
              background: '#fff', borderRadius: 10, padding: 12, marginBottom: 9,
              border: selected === p.n ? '2px solid var(--gold)' : '1px solid var(--cream-mid)',
              cursor: 'pointer', transition: 'border-color 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: p.bg, color: p.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 13, flexShrink: 0 }}>{p.initials}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{p.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-light)', marginTop: 1 }}>{p.skill}</div>
                <div style={{ fontSize: 10, color: 'var(--gold)' }}>{p.stars} <span style={{ color: 'var(--text-light)' }}>{p.rating}</span></div>
              </div>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--accent)' }}>{p.eta}</div>
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
              {p.tags.map(t => (
                <span key={t} style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: 'var(--cream)', color: 'var(--text-muted)', border: '1px solid var(--cream-mid)' }}>{t}</span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 9, fontSize: 10, color: 'var(--text-muted)' }}>
              <span><i className="ti ti-map-pin" /> {p.dist}</span>
              <span><i className="ti ti-tools" /> {p.jobs}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '12px 14px', background: '#fff', borderTop: '1px solid var(--cream-mid)' }}>
        <button onClick={onNext} style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: 'var(--gold)', color: 'var(--navy)', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          Request quote from {selected === 1 ? 'Raj' : 'Sipho'}
        </button>
      </div>
    </div>
  )
}

function QuoteView({ onBack, onApprove }: { onBack: () => void; onApprove: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <ProgressHeader pct={66} title="Review quote" onBack={onBack} />
      <div style={{ padding: 14, background: 'var(--cream)', flex: 1 }}>
        {/* Provider row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12, background: '#fff', borderRadius: 10, padding: 10, border: '1px solid var(--cream-mid)' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#DCF0E8', color: '#1A6842', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 12, flexShrink: 0 }}>RP</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 500 }}>Raj Pillay</div>
            <div style={{ fontSize: 10, color: 'var(--text-light)' }}>Quote valid 30 minutes</div>
          </div>
          <span className="pill pill-live">Approved</span>
        </div>

        {/* Quote breakdown */}
        <div style={{ background: '#fff', borderRadius: 10, padding: 13, marginBottom: 10, border: '1px solid var(--cream-mid)' }}>
          {[
            { label: 'Call-out fee', val: 'R 150' },
            { label: 'Labour (est. 2h)', val: 'R 700' },
            { label: 'Parts — fittings', val: 'R 280' },
            { label: 'Premium discount', val: '−R 130', green: true },
            { label: 'Total', val: 'R 1 000', bold: true },
          ].map(r => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: r.bold ? 13 : 12, padding: '4px 0', borderBottom: r.bold ? 'none' : '1px solid var(--cream-mid)', fontWeight: r.bold ? 500 : 400, marginTop: r.bold ? 3 : 0 }}>
              <span style={{ color: 'var(--text-muted)' }}>{r.label}</span>
              <span style={{ color: r.green ? 'var(--accent)' : r.bold ? 'var(--navy)' : undefined }}>{r.val}</span>
            </div>
          ))}
        </div>

        {/* Warranty */}
        <div style={{ background: '#E8F5EE', borderRadius: 9, padding: '9px 11px', display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
          <i className="ti ti-shield-check" style={{ color: 'var(--accent)', fontSize: 16, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: '#1A5C38' }}><strong>90-day warranty</strong> on all parts and labour with Premium plan.</span>
        </div>

        {/* Payment */}
        <div style={{ background: '#fff', borderRadius: 10, padding: 11, border: '1px solid var(--cream-mid)', marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>Payment via</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['Card · saved', 'EFT', 'PayFast'].map((m, i) => (
              <div key={m} style={{ flex: 1, padding: 7, borderRadius: 8, border: i === 0 ? '2px solid var(--gold)' : '1px solid var(--cream-mid)', background: i === 0 ? '#FFFBF0' : undefined, fontSize: 11, fontWeight: i === 0 ? 500 : 400, textAlign: 'center', color: i === 0 ? 'var(--gold)' : 'var(--text-muted)' }}>{m}</div>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-light)', textAlign: 'center' }}>Payment held securely until job is complete.</div>
      </div>
      <div style={{ padding: '12px 14px', background: '#fff', borderTop: '1px solid var(--cream-mid)' }}>
        <button onClick={onApprove} style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: 'var(--gold)', color: 'var(--navy)', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, cursor: 'pointer', marginBottom: 7 }}>
          Approve & pay R 1 000
        </button>
        <button onClick={onBack} style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: 'var(--cream-mid)', color: 'var(--text)', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          Request different provider
        </button>
      </div>
    </div>
  )
}

function TrackingView({ techPos, eta, onComplete }: { techPos: { x: number; y: number }; eta: number; onBack: () => void; onComplete: () => void }) {
  const steps = [
    { label: 'Booking confirmed & payment held', state: 'done' },
    { label: 'Raj accepted your request', state: 'done' },
    { label: `En route · ETA ${eta} min`, state: 'active' },
    { label: 'Job in progress', state: 'todo', n: 4 },
    { label: 'Complete & payment released', state: 'todo', n: 5 },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 3, background: 'var(--cream-mid)' }}>
        <div style={{ height: '100%', width: '88%', background: 'var(--gold)' }} />
      </div>
      <div style={{ padding: '12px 14px', background: '#fff', borderBottom: '1px solid var(--cream-mid)', display: 'flex', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>Raj is on his way</div>
          <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 500 }}>ETA {eta} minutes</div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-light)' }}>#B-1039</div>
      </div>
      <div style={{ padding: 14, background: 'var(--cream)', flex: 1 }}>
        {/* Map */}
        <div style={{ height: 170, background: 'var(--navy-mid)', borderRadius: 10, marginBottom: 12, position: 'relative', overflow: 'hidden' }}>
          <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
            <defs>
              <pattern id="tg" width="22" height="22" patternUnits="userSpaceOnUse">
                <path d="M22 0L0 0 0 22" fill="none" stroke="#fff" strokeWidth="0.3" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#tg)" opacity="0.07" />
            <path d="M15 145Q70 110 150 120Q210 130 270 90Q310 68 320 55" stroke="#fff" strokeWidth="1.5" fill="none" opacity="0.18" />
          </svg>
          {/* Tech dot */}
          <div style={{ position: 'absolute', left: `${techPos.x}%`, top: `${techPos.y}%`, transition: 'left 0.3s, top 0.3s' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--accent-light)', border: '2.5px solid #fff' }} />
            <div className="pulse-ring" />
          </div>
          {/* Destination */}
          <div style={{ position: 'absolute', right: '28%', top: '33%' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--gold)', border: '2.5px solid #fff' }} />
          </div>
          {/* ETA bubble */}
          <div style={{ position: 'absolute', top: 9, right: 9, background: '#fff', borderRadius: 7, padding: '5px 9px', fontSize: 10, fontWeight: 500, color: 'var(--navy)' }}>
            <i className="ti ti-clock" style={{ fontSize: 11, marginRight: 3 }} />{eta} min
          </div>
        </div>

        {/* Tech info */}
        <div style={{ background: '#fff', borderRadius: 10, padding: 12, marginBottom: 9, display: 'flex', alignItems: 'center', gap: 10, border: '1px solid var(--cream-mid)' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#DCF0E8', color: '#1A6842', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 14, flexShrink: 0 }}>RP</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Raj Pillay</div>
            <div style={{ fontSize: 11, color: 'var(--text-light)' }}>Master Plumber · 1.4km</div>
          </div>
          <div style={{ display: 'flex', gap: 7 }}>
            {['ti-phone', 'ti-message'].map(ic => (
              <div key={ic} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--cream-mid)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <i className={`ti ${ic}`} style={{ fontSize: 14 }} />
              </div>
            ))}
          </div>
        </div>

        {/* Status steps */}
        <div style={{ background: '#fff', borderRadius: 10, padding: 12, border: '1px solid var(--cream-mid)' }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: i < steps.length - 1 ? 9 : 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: s.state === 'done' ? 'var(--accent)' : s.state === 'active' ? 'var(--gold)' : 'var(--cream-mid)',
                  color: s.state === 'todo' ? 'var(--text-light)' : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9,
                }}>
                  {s.state === 'done' ? <i className="ti ti-check" /> : s.state === 'active' ? <i className="ti ti-map-pin" /> : s.n}
                </div>
                {i < steps.length - 1 && <div style={{ width: 1.5, height: 18, background: 'var(--cream-mid)', margin: '2px auto' }} />}
              </div>
              <div style={{ fontSize: 11, color: s.state === 'done' ? 'var(--accent)' : s.state === 'active' ? 'var(--text)' : 'var(--text-muted)', fontWeight: s.state === 'active' ? 500 : 400, paddingTop: 2 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: '12px 14px', background: '#fff', borderTop: '1px solid var(--cream-mid)' }}>
        <button onClick={onComplete} style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#fff', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          Mark job complete
        </button>
      </div>
    </div>
  )
}

function RatingView({ rating, tags, onRating, onTagToggle, onSubmit }: { rating: number; tags: string[]; onRating: (n: number) => void; onTagToggle: (t: string) => void; onSubmit: () => void }) {
  const ALL_TAGS = ['Punctual', 'Professional', 'Clean work', 'Friendly', 'Great value']
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '12px 14px', background: '#fff', borderBottom: '1px solid var(--cream-mid)' }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>Rate your experience</div>
      </div>
      <div style={{ padding: 14, background: 'var(--cream)', flex: 1, textAlign: 'center' }}>
        <div style={{ margin: '14px 0 4px' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#DCF0E8', color: '#1A6842', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 18, margin: '0 auto 7px' }}>RP</div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>Raj Pillay</div>
          <div style={{ fontSize: 11, color: 'var(--text-light)' }}>Geyser repair · R 1 000</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 9, margin: '14px 0', fontSize: 28, cursor: 'pointer' }}>
          {[1, 2, 3, 4, 5].map(n => (
            <span key={n} onClick={() => onRating(n)} style={{ color: n <= rating ? 'var(--gold)' : 'var(--cream-mid)', transition: 'color 0.1s' }}>★</span>
          ))}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 12, justifyContent: 'center' }}>
          {ALL_TAGS.map(t => (
            <span
              key={t}
              onClick={() => onTagToggle(t)}
              style={{
                padding: '6px 11px', borderRadius: 20, cursor: 'pointer', fontSize: 11,
                border: tags.includes(t) ? '1px solid var(--gold)' : '1px solid var(--cream-mid)',
                color: tags.includes(t) ? 'var(--gold)' : 'var(--text-muted)',
                background: tags.includes(t) ? '#FFFBF0' : '#fff',
                transition: 'all 0.15s',
              }}
            >{t}</span>
          ))}
        </div>
        <div style={{ background: '#FFFBF0', borderRadius: 9, border: '1px solid #F0C060', padding: '9px 11px', display: 'flex', alignItems: 'center', gap: 7, textAlign: 'left' }}>
          <i className="ti ti-shield-check" style={{ color: 'var(--gold)', fontSize: 16, flexShrink: 0 }} />
          <span style={{ fontSize: 11, color: '#7A5010' }}>90-day warranty now active. Raj saved to your contacts.</span>
        </div>
      </div>
      <div style={{ padding: '12px 14px', background: '#fff', borderTop: '1px solid var(--cream-mid)' }}>
        <button onClick={onSubmit} style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: 'var(--gold)', color: 'var(--navy)', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          Submit review
        </button>
      </div>
    </div>
  )
}

function DoneView({ onHome }: { onHome: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '28px 20px', background: 'var(--cream)', minHeight: 500 }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#DCF0E8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        <i className="ti ti-check" style={{ fontSize: 28, color: 'var(--accent)' }} />
      </div>
      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: 'var(--navy)', marginBottom: 7 }}>All done!</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7, maxWidth: 240, marginBottom: 20 }}>
        R 1 000 released to Raj. 90-day warranty active. Receipt emailed.
      </div>
      <div style={{ background: 'var(--cream-mid)', borderRadius: 10, padding: '12px 16px', width: '100%', marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: 'var(--text-light)', marginBottom: 3 }}>Loyalty points earned</div>
        <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, fontWeight: 300, color: 'var(--navy)' }}>+50 pts</div>
        <div style={{ fontSize: 10, color: 'var(--text-light)' }}>Total: 340 · Next reward at 500</div>
      </div>
      <button onClick={onHome} style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: 'var(--gold)', color: 'var(--navy)', fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
        Back to home
      </button>
    </div>
  )
}
