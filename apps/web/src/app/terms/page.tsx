import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — Easyfix',
  description: 'Terms and conditions for using the Easyfix platform.',
}

export default function TermsOfService() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px', fontFamily: 'system-ui, sans-serif', color: '#1a1a1a', lineHeight: 1.7 }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, color: '#1A5C1A', textTransform: 'uppercase', marginBottom: 8 }}>Easyfix</div>
        <h1 style={{ fontSize: 36, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>Terms of Service</h1>
        <p style={{ color: '#666', marginTop: 8 }}>Effective date: 1 July 2026 · Last updated: 20 July 2026</p>
      </div>

      <section>
        <p>These Terms of Service ("Terms") govern your use of the Easyfix mobile application and website operated by Easyfix (Pty) Ltd ("Easyfix", "we", "us"). By creating an account or using the platform you agree to be bound by these Terms.</p>
      </section>

      {[
        {
          title: '1. The Platform',
          content: [
            'Easyfix is a marketplace that connects clients seeking home services and equipment hire with independent service providers operating in KwaZulu-Natal and surrounding areas.',
            'Easyfix is not itself a service provider. We do not employ technicians or providers. Each provider is an independent contractor responsible for the quality of their own work.',
            'Easyfix facilitates payment, booking management, and dispute resolution between clients and providers.',
          ],
        },
        {
          title: '2. Eligibility',
          content: [
            'You must be at least 18 years old to use Easyfix.',
            'You must provide accurate, current, and complete registration information.',
            'You are responsible for maintaining the confidentiality of your account credentials.',
            'Service providers must complete KYC verification before accepting bookings.',
          ],
        },
        {
          title: '3. Bookings and Payments',
          content: [
            'When you book a service, your payment is held securely via Peach Payments until the job is marked complete.',
            'Payment is released to the provider within 48 hours of job completion, less Easyfix\'s service fee.',
            'The service fee is 15% of the quoted amount for standard bookings.',
            'Emergency callout bookings carry a flat dispatch fee of R850 in addition to the service quote.',
            'Cancellations made more than 2 hours before a scheduled job are fully refunded. Cancellations within 2 hours may incur a 20% cancellation fee.',
          ],
        },
        {
          title: '4. Provider Obligations',
          content: [
            'Providers must be licensed, insured, and competent for the services they list.',
            'Providers must maintain professional conduct at all client premises.',
            'Providers must upload accurate availability and service area information.',
            'Providers who receive 3 or more substantiated complaints may be suspended or removed from the platform.',
            'Providers are responsible for their own tax obligations including VAT and income tax.',
          ],
        },
        {
          title: '5. Marketplace Listings',
          content: [
            'The Easyfix Marketplace allows users to post listings for goods, property, and jobs.',
            'Users who post listings must verify their identity via South African ID number.',
            'Listings must be accurate and not misleading. Prohibited items include weapons, stolen goods, counterfeit items, and illegal substances.',
            'Easyfix reserves the right to remove any listing that violates these Terms or applicable law.',
            'Easyfix is not a party to transactions between marketplace buyers and sellers and accepts no liability for such transactions.',
          ],
        },
        {
          title: '6. Prohibited Conduct',
          content: [
            'You may not use the platform for any unlawful purpose.',
            'You may not post false, misleading, or fraudulent listings or reviews.',
            'You may not harass, threaten, or abuse other users or providers.',
            'You may not attempt to circumvent the platform\'s payment system.',
            'You may not scrape, reverse-engineer, or otherwise misuse the platform\'s systems.',
          ],
        },
        {
          title: '7. Warranties and Liability',
          content: [
            'Easyfix provides a 90-day warranty on parts and labour for completed home services bookings, administered through the platform.',
            'Easyfix is not liable for any indirect, incidental, or consequential damages arising from use of the platform.',
            'Our total liability to you for any claim shall not exceed the amount you paid for the booking giving rise to the claim.',
            'Equipment hire services are provided by independent providers. Easyfix does not warrant the condition or fitness for purpose of hired equipment.',
          ],
        },
        {
          title: '8. Intellectual Property',
          content: [
            'The Easyfix name, logo, and platform content are the property of Easyfix (Pty) Ltd.',
            'You may not use our trademarks or branding without prior written consent.',
            'User-generated content (reviews, listing photos) remains your property but you grant Easyfix a non-exclusive licence to display it on the platform.',
          ],
        },
        {
          title: '9. Termination',
          content: [
            'You may close your account at any time by contacting hello@easyfix.co.za.',
            'Easyfix may suspend or terminate your account if you breach these Terms, without liability to you.',
            'Upon termination, your right to use the platform ceases immediately. Outstanding payments due to providers will still be processed.',
          ],
        },
        {
          title: '10. Governing Law',
          content: [
            'These Terms are governed by the laws of the Republic of South Africa.',
            'Any disputes shall be resolved in the courts of KwaZulu-Natal.',
            'These Terms constitute the entire agreement between you and Easyfix regarding your use of the platform.',
          ],
        },
        {
          title: '11. Contact',
          content: [
            'Easyfix (Pty) Ltd',
            'Email: hello@easyfix.co.za',
            'Durban, KwaZulu-Natal, South Africa',
          ],
        },
      ].map(section => (
        <section key={section.title} style={{ marginTop: 36 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: '#1A5C1A' }}>{section.title}</h2>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {section.content.map((item, i) => (
              <li key={i} style={{ marginBottom: 8 }}>{item}</li>
            ))}
          </ul>
        </section>
      ))}

      <footer style={{ marginTop: 60, paddingTop: 24, borderTop: '1px solid #eee', color: '#999', fontSize: 12 }}>
        © 2026 Easyfix (Pty) Ltd · Durban, KwaZulu-Natal ·{' '}
        <a href="/privacy" style={{ color: '#1A5C1A' }}>Privacy Policy</a>
      </footer>
    </main>
  )
}
