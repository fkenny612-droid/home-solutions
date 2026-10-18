import type { Metadata, Viewport } from 'next'
import { DM_Sans, DM_Serif_Display } from 'next/font/google'
import { SITE, siteUrl } from '@/lib/site'
import './globals.css'

// Self-hosted by Next at build time: no render-blocking request to Google Fonts.
const sans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-sans', display: 'swap' })
const display = DM_Serif_Display({ subsets: ['latin'], weight: '400', variable: '--font-display', display: 'swap' })

const TITLE = 'Easyfix – Book Plumbers, Electricians & Cleaners in Durban'
const DESCRIPTION =
  'Book home services in Durban in minutes. See your price upfront, pay only when the job is done, and get emergency help fast. Android app coming soon.'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: TITLE, template: `%s | ${SITE.name}` },
  description: DESCRIPTION,
  applicationName: SITE.name,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    locale: 'en_ZA',
    title: TITLE,
    description: DESCRIPTION,
    url: '/',
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: '#0C0A09',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-ZA" className={`${sans.variable} ${display.variable}`}>
      <body>{children}</body>
    </html>
  )
}
