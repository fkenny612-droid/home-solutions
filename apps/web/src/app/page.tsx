'use client'

import { useState } from 'react'
import SiteNav from '@/components/SiteNav'
import OverviewSection from '@/components/OverviewSection'
import ClientAppSection from '@/components/client/ClientAppSection'
import AdminSection from '@/components/admin/AdminSection'
import ProviderSection from '@/components/provider/ProviderSection'
import SiteFooter from '@/components/SiteFooter'

export type ActiveSection = 'overview' | 'client' | 'admin' | 'provider'

export default function HomePage() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('overview')

  return (
    <>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@2.44.0/tabler-icons.min.css"
      />
      <SiteNav active={activeSection} onNavigate={setActiveSection} />

      {/* Hero */}
      <div style={{
        padding: '60px 32px 48px',
        textAlign: 'center',
        background: 'linear-gradient(180deg, #0A0A0A 0%, #0F1923 100%)',
      }}>
        <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 16 }}>
          Durban · KZN · South Africa
        </div>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 48, color: '#fff', lineHeight: 1.1, marginBottom: 14 }}>
          Home services,<br /><span style={{ color: 'var(--gold)' }}>on demand</span>
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', maxWidth: 520, margin: '0 auto 28px', lineHeight: 1.7 }}>
          A vetted marketplace connecting homeowners with certified plumbers, electricians,
          cleaners, and tradespeople — with live tracking, secure payments, and a 90-day warranty.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn-gold" onClick={() => setActiveSection('client')}>
            <i className="ti ti-device-mobile" /> Client App
          </button>
          <button className="btn-outline-white" onClick={() => setActiveSection('admin')}>
            <i className="ti ti-layout-dashboard" /> Admin Portal
          </button>
          <button className="btn-outline-white" onClick={() => setActiveSection('provider')}>
            <i className="ti ti-tools" /> Provider App
          </button>
        </div>
      </div>

      {activeSection === 'overview' && <OverviewSection onNavigate={setActiveSection} />}
      {activeSection === 'client' && <ClientAppSection />}
      {activeSection === 'admin' && <AdminSection />}
      {activeSection === 'provider' && <ProviderSection />}

      <SiteFooter />
    </>
  )
}
