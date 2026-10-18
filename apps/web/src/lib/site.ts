/** One place for the facts every page and the SEO metadata repeat. */
export const SITE = {
  name:  'Easyfix',
  legal: 'Easyfix (Pty) Ltd',
  email: 'hello@easyfix.co.za',
  city:  'Durban',
  region: 'KwaZulu-Natal',
} as const

/**
 * Canonical origin. Set NEXT_PUBLIC_SITE_URL once the easyfix.co.za domain is connected; until then Vercel's
 * production URL is used, so canonical links, the sitemap and social previews always point at a live address.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit.replace(/\/$/, '')
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (vercel) return `https://${vercel}`
  return 'http://localhost:3000'
}

export const EARLY_ACCESS_URL =
  `mailto:${SITE.email}?subject=${encodeURIComponent('Easyfix early access')}&body=${encodeURIComponent('Hi Easyfix, please tell me when the app is live. I am in: ')}`

export const PROVIDER_URL =
  `mailto:${SITE.email}?subject=${encodeURIComponent('Join Easyfix as a service provider')}&body=${encodeURIComponent('Hi Easyfix, I would like to join as a service provider.\n\nName:\nService(s):\nArea(s):\nPhone:')}`

export function rand(n: number): string {
  return 'R' + n.toLocaleString('en-US').replace(/,/g, ' ')
}
