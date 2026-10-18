import Link from 'next/link'
import { SERVICE_PAGES } from '@/lib/service-pages'
import { SITE } from '@/lib/site'

export default function Footer() {
  return (
    <footer className="mk-footer">
      <div className="mk-wrap">
        <div className="mk-footer-grid">
          <div>
            <h4>Easyfix</h4>
            <p>Home services and equipment hire in Durban and surrounding KwaZulu-Natal. See your price, pay when the job is done.</p>
            <p style={{ marginTop: 12 }}><a href={`mailto:${SITE.email}`}>{SITE.email}</a></p>
          </div>
          <div>
            <h4>Services in Durban</h4>
            <ul>
              {SERVICE_PAGES.map(s => (
                <li key={s.slug}><Link href={`/services/${s.slug}`}>{s.nav}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4>Easyfix</h4>
            <ul>
              <li><Link href="/#how-it-works">How it works</Link></li>
              <li><Link href="/#safety">Safety &amp; payments</Link></li>
              <li><Link href="/for-service-providers">For service providers</Link></li>
              <li><Link href="/#faq">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <h4>Legal</h4>
            <ul>
              <li><Link href="/terms">Terms of service</Link></li>
              <li><Link href="/privacy">Privacy policy</Link></li>
              <li><Link href="/delete-account">Delete your account</Link></li>
            </ul>
          </div>
        </div>
        <div className="mk-footer-bottom">© 2026 {SITE.legal} · {SITE.city}, {SITE.region}, South Africa</div>
      </div>
    </footer>
  )
}
