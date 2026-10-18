import type { Metadata } from 'next'
import Link from 'next/link'
import Icon from '@/components/marketing/Icon'
import JsonLd from '@/components/marketing/JsonLd'
import { PROVIDER_URL, SITE, siteUrl } from '@/lib/site'

const TITLE = 'Get More Jobs as a Service Provider in Durban'
const DESCRIPTION =
  'Plumbers, electricians, cleaners and handymen in Durban: receive job requests from local customers, get paid securely and keep up to 92% of every job. Join Easyfix.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/for-service-providers' },
  openGraph: { title: `${TITLE} | ${SITE.name}`, description: DESCRIPTION, url: '/for-service-providers', type: 'website' },
}

const PLANS = [
  { name: 'Starter', commission: '20%', keep: '80%', status: 'Available now' },
  { name: 'Pro', commission: '12%', keep: '88%', status: 'Coming soon' },
  { name: 'Elite', commission: '8%', keep: '92%', status: 'Coming soon' },
]

const STEPS = [
  { title: 'Register in the app', body: 'Create your provider profile, choose the services you offer and the areas you work in.' },
  { title: 'Complete verification', body: 'Submit your identity (KYC) documents. You can start accepting bookings once you are verified.' },
  { title: 'Accept jobs you want', body: 'Customers send requests. You choose which ones to accept, and chat with the customer in the app.' },
  { title: 'Get paid', body: 'The customer\'s payment is secured before you start. Mark the job complete and your earnings are credited, less the commission for your plan. Request a payout to your bank account any time.' },
]

const FAQS = [
  { q: 'Does it cost anything to join?', a: 'There is no sign-up fee. On the Starter plan Easyfix keeps a 20% commission on each completed job. The commission is taken from your payment, it is never added to the customer\'s price.' },
  { q: 'When do I get paid?', a: 'Once you mark a job complete, the customer\'s card is charged and your earnings are credited less commission. You can then request a payout, and Easyfix pays it into your bank account after processing.' },
  { q: 'Can I choose which jobs to accept?', a: 'Yes. You see the job details and decide whether to accept or decline each request. Declining returns the customer\'s payment, so there is no penalty for turning down work that is not right for you.' },
  { q: 'What do I need to join?', a: 'A South African ID, your trade skills, and a bank account for payouts. You complete KYC verification in the app before accepting bookings.' },
  { q: 'Which areas and services are open?', a: 'We are launching in Durban (eThekwini) first. Plumbing, electrical, cleaning, handyman, pest control, locksmith, aircon, pool and other home services are supported.' },
]

export default function ForProviders() {
  const url = siteUrl()
  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Easyfix', item: url },
              { '@type': 'ListItem', position: 2, name: 'For service providers', item: `${url}/for-service-providers` },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: FAQS.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
          },
        ],
      }} />

      <section className="mk-page-hero">
        <div className="mk-wrap">
          <nav className="mk-crumbs" aria-label="Breadcrumb"><Link href="/">Easyfix</Link> / For service providers</nav>
          <h1>Get more jobs as a plumber, electrician or cleaner in Durban</h1>
          <p className="mk-lead">Easyfix sends you job requests from customers in your area. The customer’s payment is secured before you start, and you choose the work you take.</p>
          <div className="mk-cta-row">
            <a className="mk-btn mk-btn--gold" href={PROVIDER_URL}>Join as a service provider <Icon name="arrow" size={18} /></a>
          </div>
          <p className="mk-soon">Launching in Durban. Android app coming soon to Google Play.</p>
        </div>
      </section>

      <section className="mk-section mk-section--white">
        <div className="mk-wrap">
          <div className="mk-kicker">How it works</div>
          <h2 className="mk-h2">From sign-up to payout</h2>
          <ol className="mk-steps" style={{ marginTop: 32 }}>
            {STEPS.map(s => (
              <li key={s.title} className="mk-step"><h3>{s.title}</h3><p>{s.body}</p></li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mk-section">
        <div className="mk-wrap">
          <div className="mk-kicker">Commission</div>
          <h2 className="mk-h2">You keep most of what you earn</h2>
          <p className="mk-sub">Easyfix earns a commission only when you complete a job. It comes out of your payment and is never added to the customer’s price.</p>
          <div className="mk-prose" style={{ maxWidth: 720 }}>
            <table className="mk-table">
              <thead><tr><th>Plan</th><th>Commission</th><th>You keep</th></tr></thead>
              <tbody>
                {PLANS.map(p => (
                  <tr key={p.name}><td>{p.name} <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 13 }}>· {p.status}</span></td><td>{p.commission}</td><td>{p.keep}</td></tr>
                ))}
              </tbody>
            </table>
            <p className="mk-note">Commission rates as set out in our <Link href="/terms" style={{ textDecoration: 'underline' }}>terms of service</Link>.</p>
          </div>
        </div>
      </section>

      <section className="mk-section mk-section--white">
        <div className="mk-wrap">
          <h2 className="mk-h2">Provider questions</h2>
          <div className="mk-faq" style={{ marginTop: 24 }}>
            {FAQS.map(f => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}
          </div>
        </div>
      </section>

      <section className="mk-section mk-section--dark mk-final">
        <div className="mk-wrap">
          <h2>Ready to take on more work?</h2>
          <p>Send us a message with your name, trade and area and we will get you set up when the app launches.</p>
          <div className="mk-cta-row">
            <a className="mk-btn mk-btn--gold" href={PROVIDER_URL}>Join as a service provider <Icon name="arrow" size={18} /></a>
          </div>
        </div>
      </section>
    </>
  )
}
