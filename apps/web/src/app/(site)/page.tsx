import type { Metadata } from 'next'
import Link from 'next/link'
import Icon from '@/components/marketing/Icon'
import JsonLd from '@/components/marketing/JsonLd'
import { CATALOGUE } from '@/lib/services.generated'
import { SERVICE_PAGES } from '@/lib/service-pages'
import { EARLY_ACCESS_URL, SITE, siteUrl } from '@/lib/site'

export const metadata: Metadata = {
  alternates: { canonical: '/' },
}

const FAQS = [
  {
    q: 'Is Easyfix available yet?',
    a: 'We are launching in Durban first. The Android app is coming soon to Google Play. Email hello@easyfix.co.za to be told as soon as it is live.',
  },
  {
    q: 'How much does a service cost?',
    a: 'Every job type shows a price range, and you see your exact quote before you pay. Prices start from R250 for cleaning and R350 for plumbing. The price you are quoted is the price you pay.',
  },
  {
    q: 'When is my card charged?',
    a: 'When you request a provider, the amount is held on your card, not charged. It is charged when the provider marks the job complete. If the provider declines, nobody accepts in time, or you cancel before work starts, the hold is released.',
  },
  {
    q: 'What if it is an emergency?',
    a: 'Use the emergency option for a burst pipe, a power failure or a lockout. Emergency callouts are a flat R850. If no provider accepts within 15 minutes the request is cancelled automatically and the hold on your card is released, so you are never left waiting.',
  },
  {
    q: 'How are service providers checked?',
    a: 'Providers must complete KYC (identity) verification before they can accept bookings. Customers leave reviews after each job, and you can report abusive messages and listings from inside the app.',
  },
  {
    q: 'Do providers get my phone number?',
    a: 'Only the provider who accepts your request sees your contact number. Until then you chat in the app.',
  },
  {
    q: 'Which areas do you cover?',
    a: 'We are starting in eThekwini (Durban) and will grow across KwaZulu-Natal. Providers set the areas they work in, and you can see who is available when you book.',
  },
  {
    q: 'Can I earn money as a service provider?',
    a: 'Yes. Plumbers, electricians, cleaners and other tradespeople can join Easyfix, receive job requests, and get paid to their bank account on request. See the service provider page for how it works.',
  },
]

const FEATURES = [
  { icon: 'tag' as const, title: 'Your price, up front', body: 'Answer a few questions about the job and see a price range and a quote before you pay. No chasing quotes over WhatsApp.' },
  { icon: 'lock' as const, title: 'Pay when the job is done', body: 'Your card is held, not charged. The amount is only taken when the provider marks the work complete, and released if the booking does not go ahead.' },
  { icon: 'clock' as const, title: 'Emergency answered in 15 minutes, or refunded', body: 'Burst pipe or power gone? Send an emergency request. If nobody accepts within 15 minutes it is cancelled and your hold is released automatically.' },
  { icon: 'shield' as const, title: 'Verified providers', body: 'Service providers complete identity (KYC) verification before they can accept bookings, and customers can leave reviews after each job.' },
  { icon: 'phone' as const, title: 'Your number stays private', body: 'Only the provider who accepts your request sees your phone number. Until then, you talk to us and to them inside the app.' },
  { icon: 'pin' as const, title: 'Local to Durban', body: 'Built for KwaZulu-Natal: prices in rand, providers who work in your area, and support from a team based in Durban.' },
]

const STEPS = [
  { title: 'Choose the job', body: 'Pick a service and answer a few quick questions. The app works out the price for you.' },
  { title: 'Request a provider', body: 'Review the quote and pay with your card. The amount is held, not charged.' },
  { title: 'A provider accepts', body: 'A local provider accepts your request and you can chat in the app. If nobody accepts in time, the hold is released.' },
  { title: 'Job done, payment released', body: 'When the provider marks the work complete your card is charged. Leave a review for the next customer.' },
]

export default function HomePage() {
  const url = siteUrl()
  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization',
            '@id': `${url}/#organization`,
            name: SITE.name,
            legalName: SITE.legal,
            url,
            email: SITE.email,
            areaServed: { '@type': 'City', name: 'Durban', containedInPlace: { '@type': 'AdministrativeArea', name: 'KwaZulu-Natal' } },
            description: 'A marketplace connecting homeowners in Durban with plumbers, electricians, cleaners and other home service providers.',
          },
          {
            '@type': 'WebSite',
            '@id': `${url}/#website`,
            url,
            name: SITE.name,
            inLanguage: 'en-ZA',
            publisher: { '@id': `${url}/#organization` },
          },
          {
            '@type': 'FAQPage',
            mainEntity: FAQS.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
          },
        ],
      }} />

      {/* Hero */}
      <section className="mk-hero">
        <div className="mk-wrap">
          <div>
            <div className="mk-eyebrow"><Icon name="pin" size={14} /> Durban · KwaZulu-Natal</div>
            <h1>Plumbers, electricians &amp; cleaners in Durban, <em>booked in minutes</em></h1>
            <p className="mk-lead">
              Easyfix connects Durban homeowners with local service providers. See your price before you book, and
              pay only when the job is done.
            </p>
            <div className="mk-cta-row">
              <a className="mk-btn mk-btn--gold" href={EARLY_ACCESS_URL}>Get early access <Icon name="arrow" size={18} /></a>
              <Link className="mk-btn mk-btn--ghost" href="/#services">Browse services</Link>
            </div>
            <p className="mk-soon">Android app coming soon to Google Play.</p>
            <ul className="mk-proof">
              <li><Icon name="check" size={18} /> Price shown before you pay</li>
              <li><Icon name="check" size={18} /> Card held, charged when done</li>
              <li><Icon name="check" size={18} /> Emergency help in 15 minutes</li>
            </ul>
          </div>

          <div className="mk-phone-wrap" aria-hidden="true">
            <div className="mk-phone">
              <div className="mk-phone-top">
                <small>Your request</small>
                <strong>Blocked drain</strong>
              </div>
              <div className="mk-phone-body">
                <div className="mk-q">
                  <div className="mk-q-row"><span>Service</span><b>Plumbing</b></div>
                  <div className="mk-q-row"><span>When</span><b>Standard</b></div>
                  <div className="mk-q-row"><span>Price range</span><b>R350 – R600</b></div>
                  <div className="mk-q-row mk-q-row--total"><span>Your quote</span><b>R475</b></div>
                </div>
                <div className="mk-hold">
                  <Icon name="lock" size={16} />
                  <span>Held on your card. You are charged only when the job is marked done.</span>
                </div>
                <div className="mk-phone-btn">Request a provider</div>
              </div>
              <div className="mk-phone-note">Example quote</div>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="mk-section" id="services">
        <div className="mk-wrap">
          <div className="mk-kicker">Services</div>
          <h2 className="mk-h2">Home services in Durban</h2>
          <p className="mk-sub">Pick a service to see what it covers and what jobs typically cost.</p>
          <div className="mk-grid">
            {SERVICE_PAGES.map(s => {
              const c = CATALOGUE[s.catalogueId]
              return (
                <Link key={s.slug} href={`/services/${s.slug}`} className="mk-svc">
                  <span className="mk-svc-icon" style={{ background: s.bg }} aria-hidden="true">{s.emoji}</span>
                  <h3>{s.nav}</h3>
                  <p>{c.jobs.slice(0, 3).map(j => j.label).join(', ')} and more</p>
                  <span className="mk-svc-price">{c.priceLabel}</span>
                </Link>
              )
            })}
          </div>
          <p className="mk-more">
            The app also covers painting, tiling, landscaping, security, solar, gas, moving and event equipment hire,
            with more added over time.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="mk-section mk-section--white" id="how-it-works">
        <div className="mk-wrap">
          <div className="mk-kicker">How it works</div>
          <h2 className="mk-h2">From problem to fixed in four steps</h2>
          <p className="mk-sub">No calling around for quotes and no paying before the work is done.</p>
          <ol className="mk-steps">
            {STEPS.map(s => (
              <li key={s.title} className="mk-step">
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Trust */}
      <section className="mk-section mk-section--dark" id="safety">
        <div className="mk-wrap">
          <div className="mk-kicker">Safety &amp; payments</div>
          <h2 className="mk-h2">Built so you are never out of pocket</h2>
          <p className="mk-sub">The rules that protect you are built into the app, not buried in the small print.</p>
          <div className="mk-feat">
            {FEATURES.map(f => (
              <div key={f.title} className="mk-feat-card">
                <Icon name={f.icon} size={26} />
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Providers */}
      <section className="mk-section">
        <div className="mk-wrap">
          <div className="mk-band">
            <div>
              <div className="mk-kicker">For service providers</div>
              <h2>Get more jobs in your area</h2>
              <p>Plumber, electrician, cleaner or handyman in Durban? Receive job requests from customers nearby and get paid to your bank account.</p>
              <Link className="mk-btn mk-btn--dark" href="/for-service-providers">How it works for providers <Icon name="arrow" size={18} /></Link>
            </div>
            <ul>
              <li><Icon name="check" size={18} /> Job requests from customers in the areas you choose</li>
              <li><Icon name="check" size={18} /> Payment is secured before you start work</li>
              <li><Icon name="check" size={18} /> Keep 80% of every job on the Starter plan</li>
              <li><Icon name="check" size={18} /> Request a payout to your bank account any time</li>
            </ul>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mk-section mk-section--white" id="faq">
        <div className="mk-wrap">
          <div className="mk-kicker">FAQ</div>
          <h2 className="mk-h2">Questions customers ask</h2>
          <div className="mk-faq" style={{ marginTop: 28 }}>
            {FAQS.map(f => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mk-section mk-section--dark mk-final">
        <div className="mk-wrap">
          <h2>Be first in line when Easyfix goes live</h2>
          <p>We are launching in Durban. Drop us an email and we will let you know the day the app is ready.</p>
          <div className="mk-cta-row">
            <a className="mk-btn mk-btn--gold" href={EARLY_ACCESS_URL}>Get early access <Icon name="arrow" size={18} /></a>
            <Link className="mk-btn mk-btn--ghost" href="/for-service-providers">I am a service provider</Link>
          </div>
        </div>
      </section>
    </>
  )
}
