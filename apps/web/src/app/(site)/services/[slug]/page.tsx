import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Icon from '@/components/marketing/Icon'
import JsonLd from '@/components/marketing/JsonLd'
import { CATALOGUE } from '@/lib/services.generated'
import { SERVICE_PAGES, getServicePage } from '@/lib/service-pages'
import { EARLY_ACCESS_URL, SITE, rand, siteUrl } from '@/lib/site'

export const dynamicParams = false

export function generateStaticParams() {
  return SERVICE_PAGES.map(s => ({ slug: s.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const page = getServicePage(params.slug)
  if (!page) return {}
  const c = CATALOGUE[page.catalogueId]
  const description = `${page.summary} See your price first (${c.priceLabel.replace(/^From/, 'from')}), pay only when the job is done. Book with Easyfix.`
  return {
    title: page.title,
    description,
    alternates: { canonical: `/services/${page.slug}` },
    openGraph: { title: `${page.title} | ${SITE.name}`, description, url: `/services/${page.slug}`, type: 'website' },
  }
}

export default function ServicePage({ params }: { params: { slug: string } }) {
  const page = getServicePage(params.slug)
  if (!page) notFound()
  const c = CATALOGUE[page.catalogueId]
  const url = siteUrl()
  const lows = c.jobs.map(j => j.min)
  const highs = c.jobs.map(j => j.max)

  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Service',
            name: `${page.nav} in Durban`,
            serviceType: c.label,
            areaServed: { '@type': 'City', name: 'Durban' },
            provider: { '@type': 'Organization', name: SITE.name, url },
            offers: {
              '@type': 'AggregateOffer',
              priceCurrency: 'ZAR',
              lowPrice: Math.min(...lows),
              highPrice: Math.max(...highs),
            },
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Easyfix', item: url },
              { '@type': 'ListItem', position: 2, name: page.nav, item: `${url}/services/${page.slug}` },
            ],
          },
          {
            '@type': 'FAQPage',
            mainEntity: page.faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
          },
        ],
      }} />

      <section className="mk-page-hero">
        <div className="mk-wrap">
          <nav className="mk-crumbs" aria-label="Breadcrumb">
            <Link href="/">Easyfix</Link> / <Link href="/#services">Services</Link> / {page.nav}
          </nav>
          <h1>{page.h1}</h1>
          <p className="mk-lead">{page.summary} {c.priceLabel}, with your exact quote shown before you pay.</p>
          <div className="mk-cta-row">
            <a className="mk-btn mk-btn--gold" href={EARLY_ACCESS_URL}>Get early access <Icon name="arrow" size={18} /></a>
          </div>
          <p className="mk-soon">Launching in Durban. Android app coming soon to Google Play.</p>
        </div>
      </section>

      <section className="mk-section mk-section--white">
        <div className="mk-wrap">
          <div className="mk-prose">
            {page.intro.map(p => <p key={p.slice(0, 24)}>{p}</p>)}

            <h2>When to book</h2>
            <ul className="mk-list">
              {page.signs.map(s => <li key={s}><Icon name="check" size={18} />{s}</li>)}
            </ul>

            <h2>What it costs</h2>
            <p>Typical price ranges for {page.nav.toLowerCase()} jobs in the Easyfix app:</p>
          </div>
          <div className="mk-prose" style={{ marginTop: 16 }}>
            <table className="mk-table">
              <thead><tr><th>Job</th><th>Estimate</th></tr></thead>
              <tbody>
                {c.jobs.map(j => (
                  <tr key={j.label}><td>{j.label}</td><td>{j.min === j.max ? rand(j.min) : `${rand(j.min)} – ${rand(j.max)}`}</td></tr>
                ))}
              </tbody>
            </table>
            <p className="mk-note">Estimates only. The app shows your exact quote before you pay, and the price you are quoted is the price you pay.</p>
          </div>

          <div className="mk-prose">
            <h2>{page.tip.heading}</h2>
            {page.tip.body.map(p => <p key={p.slice(0, 24)}>{p}</p>)}

            <h2>How booking works</h2>
            <ul className="mk-list">
              <li><Icon name="check" size={18} />Choose the job and answer a few questions. The app works out the price.</li>
              <li><Icon name="check" size={18} />Pay by card. The amount is held, not charged.</li>
              <li><Icon name="check" size={18} />A local provider accepts your request. If nobody accepts in time, the hold is released.</li>
              <li><Icon name="check" size={18} />Your card is charged when the provider marks the job complete.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mk-section">
        <div className="mk-wrap">
          <h2 className="mk-h2">{page.nav} in Durban: your questions</h2>
          <div className="mk-faq" style={{ marginTop: 24 }}>
            {page.faqs.map(f => (
              <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>
            ))}
          </div>

          <h2 className="mk-h2" style={{ marginTop: 56, fontSize: 28 }}>Other services</h2>
          <div className="mk-related">
            {SERVICE_PAGES.filter(s => s.slug !== page.slug).map(s => (
              <Link key={s.slug} className="mk-chip" href={`/services/${s.slug}`}>{s.emoji} {s.nav}</Link>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
