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
        <p style={{ color: '#666', marginTop: 8 }}>Effective date: 1 July 2026 · Last updated: 18 October 2026</p>
      </div>

      <section>
        <p>These Terms of Service (&quot;Terms&quot;) govern your use of the Easyfix mobile application and website operated by Easyfix (Pty) Ltd (&quot;Easyfix&quot;, &quot;we&quot;, &quot;us&quot;). By creating an account or using the platform you agree to be bound by these Terms.</p>
      </section>

      {[
        {
          title: '1. The Platform',
          content: [
            'Easyfix is a marketplace that connects clients seeking home services and equipment hire with independent service providers operating in KwaZulu-Natal and surrounding areas.',
            'Easyfix is not itself a service provider. We do not employ technicians or providers. Each provider is an independent contractor responsible for the quality of their own work.',
            'Easyfix facilitates payment and booking management between clients and providers, and will try to help resolve disputes between them.',
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
            'The price of a booking is calculated by Easyfix from your answers about the job and shown to you before you pay. You pay that price.',
            'When you book, the amount is held on your card (not charged) through Peach Payments and the provider is asked to accept. The booking is confirmed only once the provider accepts.',
            'When the provider marks the job complete, the held amount is charged. Easyfix then credits the provider with that amount less Easyfix\'s commission, which is deducted from the provider\'s payment and is not added to your price.',
            'Provider commission depends on the provider\'s plan and is currently 20% (Starter), 12% (Pro) or 8% (Elite) of the job price. Providers are paid out to their bank account on request, after Easyfix has processed the payout.',
            'Emergency callout bookings are a flat R850. The technician must accept the request; if nobody accepts within 15 minutes the request is cancelled and the amount held on your card is released.',
            'Other bookings that no provider accepts within 2 hours are also cancelled and the held amount released.',
            'You may cancel a booking at any time until the work has started, and the amount held on your card will be released in full. Once work has started, a booking can no longer be cancelled in the app; contact us if there is a problem.',
            'If a provider declines your request or cancels before the work starts, the amount held on your card is released.',
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
            'Customers on an Easyfix subscription plan receive a workmanship warranty on completed home services bookings: 30 days on Basic Home and 90 days on Premium Home and Estate / Business. Contact us within the warranty period if the same problem comes back and we will arrange for it to be put right.',
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
            'You may close your account at any time by deleting it in the app (Profile, then Delete account) or by contacting hello@easyfix.co.za.',
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
        <a href="/privacy" style={{ color: '#1A5C1A' }}>Privacy Policy</a> ·{' '}
        <a href="/delete-account" style={{ color: '#1A5C1A' }}>Delete your account</a>
      </footer>
    </main>
  )
}
