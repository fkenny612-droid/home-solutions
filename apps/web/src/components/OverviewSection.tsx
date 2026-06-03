'use client'

import { ActiveSection } from '@/app/page'

const STACK = [
  'React Native + Expo', 'NestJS', 'PostgreSQL 16', 'Next.js 14',
  'AWS (af-south-1)', 'Peach Payments', 'Firebase FCM', 'Socket.io',
  'Redis + Bull', "Africa's Talking SMS",
]

const PANELS = [
  {
    id: 'client' as ActiveSection,
    icon: 'ti-device-mobile',
    iconBg: 'rgba(200,146,42,0.15)',
    iconColor: 'var(--gold)',
    title: 'Client App',
    desc: 'For homeowners, tenants, and estate managers. Book services, approve quotes, track technicians live, and manage warranties — all from one app.',
    cta: 'See app',
    primary: true,
  },
  {
    id: 'admin' as ActiveSection,
    icon: 'ti-layout-dashboard',
    iconBg: 'rgba(45,138,110,0.15)',
    iconColor: 'var(--accent-light)',
    title: 'Admin Portal',
    desc: 'The operational brain. Live booking monitor, dispatch map, provider verification, payment management, subscription analytics, and payout processing.',
    cta: 'See dashboard',
    primary: false,
  },
  {
    id: 'provider' as ActiveSection,
    icon: 'ti-tools',
    iconBg: 'rgba(200,146,42,0.10)',
    iconColor: 'var(--gold)',
    title: 'Provider App',
    desc: 'For vetted tradespeople. KYC onboarding, job management, earnings dashboard, and Peach Payments withdrawals — built for South African providers.',
    cta: 'See app',
    primary: false,
  },
]

export default function OverviewSection({ onNavigate }: { onNavigate: (s: ActiveSection) => void }) {
  return (
    <div style={{ padding: '40px 32px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 32 }}>
          {PANELS.map(p => (
            <div
              key={p.id}
              style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24 }}
            >
              <div style={{ width: 40, height: 40, background: p.iconBg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <i className={`ti ${p.icon}`} style={{ color: p.iconColor, fontSize: 20 }} />
              </div>
              <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, color: '#fff', marginBottom: 8 }}>{p.title}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>{p.desc}</div>
              <button
                onClick={() => onNavigate(p.id)}
                className={p.primary ? 'btn-gold' : 'btn-outline-white'}
                style={{ marginTop: 16, fontSize: 12, padding: '8px 16px' }}
              >
                {p.cta} <i className="ti ti-arrow-right" />
              </button>
            </div>
          ))}
        </div>

        {/* Tech stack */}
        <div style={{ background: '#111', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 24 }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16 }}>
            Tech stack
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9 }}>
            {STACK.map(s => (
              <span
                key={s}
                style={{ padding: '6px 13px', borderRadius: 20, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 12, color: 'rgba(255,255,255,0.6)' }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
