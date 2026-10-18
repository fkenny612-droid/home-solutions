import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Delete your account — Easyfix',
  description: 'How to delete your Easyfix account and what happens to your data.',
}

const SUPPORT_EMAIL = 'hello@easyfix.co.za'

const DELETED = [
  'Your profile and login',
  'Saved cards, saved addresses and bank details',
  'Notifications, loyalty points and unused rewards',
  'Your subscription',
  'Marketplace listings you posted',
  'Identity and trade documents you uploaded (service providers)',
]

const KEPT = [
  'Booking records, including the service address, are kept for 5 years because we are required to keep financial records for legal and tax purposes.',
  'Your name is removed from chat messages and reviews. The messages and reviews themselves stay with the booking they belong to, shown as from a deleted user.',
  'A service provider\'s profile is anonymised rather than removed, so completed jobs stay consistent.',
]

const BLOCKERS = [
  'You have a booking in progress. Complete or cancel it first.',
  'You are a service provider with an unpaid earnings balance. Request a payout and wait for it to be paid first.',
]

function List({ items }: { items: string[] }) {
  return (
    <ul style={{ paddingLeft: 20, margin: 0 }}>
      {items.map((item, i) => (
        <li key={i} style={{ marginBottom: 8 }}>{item}</li>
      ))}
    </ul>
  )
}

export default function DeleteAccount() {
  const h2 = { fontSize: 20, fontWeight: 700, marginBottom: 12, color: '#1A5C1A' } as const
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px', fontFamily: 'system-ui, sans-serif', color: '#1a1a1a', lineHeight: 1.7 }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, color: '#1A5C1A', textTransform: 'uppercase', marginBottom: 8 }}>Easyfix</div>
        <h1 style={{ fontSize: 36, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>Delete your account</h1>
        <p style={{ color: '#666', marginTop: 8 }}>
          This page explains how to delete your Easyfix account and your data, for customers and service providers.
        </p>
      </div>

      <section>
        <h2 style={h2}>Delete it in the app (fastest)</h2>
        <ol style={{ paddingLeft: 20, margin: 0 }}>
          <li style={{ marginBottom: 8 }}>Open the Easyfix app and sign in.</li>
          <li style={{ marginBottom: 8 }}>Go to the <strong>Profile</strong> tab.</li>
          <li style={{ marginBottom: 8 }}>Scroll to the bottom and tap <strong>Delete account</strong>.</li>
          <li style={{ marginBottom: 8 }}>Confirm. Your account is deleted straight away and you are signed out.</li>
        </ol>
        <p>Deleting your account cannot be undone.</p>
      </section>

      <section style={{ marginTop: 36 }}>
        <h2 style={h2}>Can&apos;t use the app?</h2>
        <p>
          Email us at <a href={`mailto:${SUPPORT_EMAIL}?subject=Delete%20my%20Easyfix%20account`} style={{ color: '#1A5C1A' }}>{SUPPORT_EMAIL}</a> with
          the subject &quot;Delete my Easyfix account&quot; and the phone number you registered with. We will check that the request
          is from you before we delete anything, and we aim to complete it within 30 days.
        </p>
      </section>

      <section style={{ marginTop: 36 }}>
        <h2 style={h2}>What is deleted</h2>
        <List items={DELETED} />
      </section>

      <section style={{ marginTop: 36 }}>
        <h2 style={h2}>What we keep, and why</h2>
        <List items={KEPT} />
      </section>

      <section style={{ marginTop: 36 }}>
        <h2 style={h2}>When deletion is blocked</h2>
        <p>We cannot delete your account while:</p>
        <List items={BLOCKERS} />
        <p>The app tells you which one applies. Once it is sorted, you can delete your account.</p>
      </section>

      <footer style={{ marginTop: 60, paddingTop: 24, borderTop: '1px solid #eee', color: '#999', fontSize: 12 }}>
        © 2026 Easyfix (Pty) Ltd · Durban, KwaZulu-Natal ·{' '}
        <a href="/privacy" style={{ color: '#1A5C1A' }}>Privacy Policy</a> ·{' '}
        <a href="/terms" style={{ color: '#1A5C1A' }}>Terms of Service</a>
      </footer>
    </main>
  )
}
