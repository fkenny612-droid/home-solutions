import { ImageResponse } from 'next/og'

export const alt = 'Easyfix – book plumbers, electricians and cleaners in Durban'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 80, background: '#0C0A09', color: '#fff', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 40 }}>
          <div style={{ width: 72, height: 72, borderRadius: 18, background: '#EAB308', color: '#0C0A09', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, fontWeight: 800 }}>E</div>
          <div style={{ fontSize: 44, fontWeight: 700 }}>Easyfix</div>
        </div>
        <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.08, maxWidth: 980 }}>
          Plumbers, electricians &amp; cleaners in Durban
        </div>
        <div style={{ fontSize: 34, color: '#EAB308', marginTop: 28 }}>See your price. Pay when the job is done.</div>
      </div>
    ),
    size,
  )
}
