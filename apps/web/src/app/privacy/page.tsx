import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — Easyfix',
  description: 'How Easyfix collects, uses, and protects your personal information.',
}

export default function PrivacyPolicy() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px', fontFamily: 'system-ui, sans-serif', color: '#1a1a1a', lineHeight: 1.7 }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, color: '#1A5C1A', textTransform: 'uppercase', marginBottom: 8 }}>Easyfix</div>
        <h1 style={{ fontSize: 36, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>Privacy Policy</h1>
        <p style={{ color: '#666', marginTop: 8 }}>Effective date: 1 July 2026 · Last updated: 20 July 2026</p>
      </div>

      <section>
        <p>Easyfix (Pty) Ltd ("Easyfix", "we", "us") operates the Easyfix mobile application and website. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information in compliance with the Protection of Personal Information Act 4 of 2013 (POPIA) and applicable South African law.</p>
        <p>By using the Easyfix platform you consent to the practices described in this policy.</p>
      </section>

      {[
        {
          title: '1. Information We Collect',
          content: [
            '**Account information** — name, phone number, email address, and password when you register.',
            '**Identity verification** — South African ID number for marketplace sellers and service providers (processed locally; we store only a verification flag, not the ID number itself).',
            '**Location data** — GPS coordinates when you request a service or use the emergency callout feature, solely to match you with nearby providers.',
            '**Payment information** — card brand and last 4 digits only. Full card details are processed by Peach Payments and never stored on our servers.',
            '**Usage data** — pages viewed, services booked, and app interactions, used to improve the platform.',
            '**Communications** — messages sent via in-app chat between clients and providers.',
            '**Device information** — device model, OS version, and push notification token for service delivery.',
          ],
        },
        {
          title: '2. How We Use Your Information',
          content: [
            'To create and manage your account.',
            'To match clients with available service providers.',
            'To process bookings, payments, and payouts.',
            'To send booking confirmations, job updates, and service reminders via push notification or SMS.',
            'To verify the identity of marketplace sellers and service providers.',
            'To calculate loyalty points and referral rewards.',
            'To improve our services through aggregated, anonymised analytics.',
            'To comply with legal and regulatory obligations under South African law.',
          ],
        },
        {
          title: '3. Sharing Your Information',
          content: [
            '**Service providers** — we share your name, phone number, and service address with the assigned provider to fulfil your booking.',
            '**Payment processors** — Peach Payments processes card transactions under their own privacy policy.',
            '**Cloud infrastructure** — data is stored on servers provided by Render and Railway, located outside South Africa. We apply appropriate safeguards as required by POPIA section 72.',
            '**Legal requirements** — we may disclose information where required by law, court order, or to protect the rights and safety of our users.',
            'We do not sell your personal information to third parties.',
          ],
        },
        {
          title: '4. Data Retention',
          content: [
            'Account data is retained for the duration of your account and for 5 years thereafter for legal and tax compliance.',
            'Booking records are retained for 5 years.',
            'Chat messages are retained for 12 months.',
            'You may request deletion of your account and associated data by emailing hello@easyfix.co.za. Some data may be retained where required by law.',
          ],
        },
        {
          title: '5. Your Rights Under POPIA',
          content: [
            'You have the right to access the personal information we hold about you.',
            'You have the right to correct inaccurate or incomplete information.',
            'You have the right to object to the processing of your personal information.',
            'You have the right to request deletion of your personal information, subject to legal retention requirements.',
            'To exercise any of these rights, contact our Information Officer at hello@easyfix.co.za.',
          ],
        },
        {
          title: '6. Security',
          content: [
            'We implement reasonable technical and organisational measures to protect your personal information against unauthorised access, loss, or misuse.',
            'Passwords are hashed using bcrypt. Payment details are encrypted in transit using TLS.',
            'In the event of a data breach that poses a risk to you, we will notify you and the Information Regulator as required by POPIA.',
          ],
        },
        {
          title: '7. Children',
          content: [
            'The Easyfix platform is not intended for persons under the age of 18. We do not knowingly collect personal information from minors. If you believe a minor has provided us with personal information, please contact us immediately.',
          ],
        },
        {
          title: '8. Changes to This Policy',
          content: [
            'We may update this Privacy Policy from time to time. We will notify you of material changes via the app or email. Continued use of the platform after changes constitutes acceptance of the updated policy.',
          ],
        },
        {
          title: '9. Contact Us',
          content: [
            'Information Officer: Easyfix (Pty) Ltd',
            'Email: hello@easyfix.co.za',
            'Address: Durban, KwaZulu-Natal, South Africa',
            'To lodge a complaint with the Information Regulator: inforeg.org.za',
          ],
        },
      ].map(section => (
        <section key={section.title} style={{ marginTop: 36 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: '#1A5C1A' }}>{section.title}</h2>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {section.content.map((item, i) => (
              <li key={i} style={{ marginBottom: 8 }}>
                {item.replace(/\*\*(.*?)\*\*/g, '$1')}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <footer style={{ marginTop: 60, paddingTop: 24, borderTop: '1px solid #eee', color: '#999', fontSize: 12 }}>
        © 2026 Easyfix (Pty) Ltd · Durban, KwaZulu-Natal ·{' '}
        <a href="/terms" style={{ color: '#1A5C1A' }}>Terms of Service</a>
      </footer>
    </main>
  )
}
