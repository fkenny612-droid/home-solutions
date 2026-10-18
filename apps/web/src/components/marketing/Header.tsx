import Link from 'next/link'
import LogoMark from '@/components/Logo'
import { EARLY_ACCESS_URL } from '@/lib/site'

export default function Header() {
  return (
    <header className="mk-header">
      <div className="mk-wrap">
        <Link href="/" className="mk-brand" aria-label="Easyfix home">
          <LogoMark size={32} variant="dark" />
          Easyfix
        </Link>
        <nav className="mk-nav" aria-label="Main">
          <Link href="/#services">Services</Link>
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/#safety">Safety &amp; payments</Link>
          <Link href="/for-service-providers">For service providers</Link>
          <Link href="/#faq">FAQ</Link>
        </nav>
        <a className="mk-btn mk-btn--gold" href={EARLY_ACCESS_URL}>Get early access</a>
      </div>
    </header>
  )
}
