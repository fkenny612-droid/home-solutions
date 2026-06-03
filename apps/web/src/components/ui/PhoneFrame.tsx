export default function PhoneFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{
        width: 340,
        background: 'var(--cream)',
        borderRadius: 40,
        overflow: 'hidden',
        border: '2px solid #2A2A2A',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
      }}>
        {/* Status bar */}
        <div style={{ background: 'var(--navy)', padding: '11px 22px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#fff', fontSize: 12, fontWeight: 500 }}>9:41</span>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center', color: '#fff', fontSize: 11 }}>
            <i className="ti ti-wifi" />
            <i className="ti ti-battery-2" />
          </div>
        </div>
        <div className="no-scrollbar" style={{ overflowY: 'auto', maxHeight: 640 }}>
          {children}
        </div>
      </div>
    </div>
  )
}
