'use client'

import { ActiveSection } from '@/app/page'
import LogoMark from './Logo'

const tabs: { id: ActiveSection; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: 'ti-layout' },
  { id: 'client', label: 'Client App', icon: 'ti-device-mobile' },
  { id: 'admin', label: 'Admin Portal', icon: 'ti-layout-dashboard' },
  { id: 'provider', label: 'Provider App', icon: 'ti-tools' },
]

export default function SiteNav({ active, onNavigate }: { active: ActiveSection; onNavigate: (s: ActiveSection) => void }) {
  return (
    <nav style={{
      background: '#0C0A09',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      padding: '0 32px',
      display: 'flex',
      alignItems: 'center',
      height: 60,
      position: 'sticky',
      top: 0,
      zIndex: 200,
    }}>
      {/* Logo */}
      <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
        <LogoMark size={32} variant="dark" />
        <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, color: '#fff' }}>
          Home Solutions
        </span>
      </a>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginLeft: 40 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            style={{
              padding: '7px 14px',
              borderRadius: 8,
              border: 'none',
              background: active === tab.id ? 'rgba(202,138,4,0.15)' : 'transparent',
              color: active === tab.id ? 'var(--gold-light)' : 'rgba(255,255,255,0.5)',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              cursor: 'pointer',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <i className={`ti ${tab.icon}`} style={{ fontSize: 13 }} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Right */}
      <div style={{ marginLeft: 'auto' }}>
        <span className="pill pill-gold">MVP Preview</span>
      </div>
    </nav>
  )
}
