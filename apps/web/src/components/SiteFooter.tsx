export default function SiteFooter() {
  return (
    <footer style={{
      background: '#0A0A0A',
      borderTop: '1px solid rgba(255,255,255,0.07)',
      padding: 32,
      textAlign: 'center',
      marginTop: 40,
    }}>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>
        <strong style={{ color: 'rgba(255,255,255,0.5)' }}>Home Solutions</strong> — Platform preview · Durban, KwaZulu-Natal · MVP Phase 1
      </p>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 6 }}>
        React Native · NestJS · PostgreSQL · AWS af-south-1 · Peach Payments
      </p>
    </footer>
  )
}
