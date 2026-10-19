import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { SITE, siteUrl } from '@/lib/site'
import './globals.css'

// Fonts live in the repo (OFL-licensed, latin subset), so the build never depends on fetching Google Fonts —
// a failed fetch during CI or a Vercel build used to be able to take the whole site's deploy down.
const sans = localFont({ src: './fonts/DMSans-latin.woff2', weight: '100 1000', variable: '--font-sans', display: 'swap' })
const display = localFont({ src: './fonts/DMSerifDisplay-latin.woff2', weight: '400', variable: '--font-display', display: 'swap' })

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
