import Header from '@/components/marketing/Header'
import Footer from '@/components/marketing/Footer'
import './site.css'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mk">
      <a className="mk-skip" href="#main">Skip to content</a>
      <Header />
      <main id="main">{children}</main>
      <Footer />
    </div>
  )
}
