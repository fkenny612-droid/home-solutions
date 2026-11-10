/** One place for the facts every page and the SEO metadata repeat. */
export const SITE = {
  name:  'Easyfix',
  legal: 'Easyfix (Pty) Ltd',
  email: 'hello@easy-fix.co.za',
  city:  'Durban',
  region: 'KwaZulu-Natal',
} as const

/**
 * Canonical origin. The apex domain (easy-fix.co.za) redirects to www on Vercel, so canonical links, the sitemap and
 * social previews use the www host that actually serves pages — pointing Google at a redirecting URL wastes crawl and
 * can split ranking. Override with NEXT_PUBLIC_SITE_URL if the primary domain ever changes.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit.replace(/\/$/, '')
  if (process.env.NODE_ENV === 'production') return 'https://www.easy-fix.co.za'
  return 'http://localhost:3000'
}

export const EARLY_ACCESS_URL =
  `mailto:${SITE.email}?subject=${encodeURIComponent('Easyfix early access')}&body=${encodeURIComponent('Hi Easyfix, please tell me when the app is live. I am in: ')}`

export const PROVIDER_URL =
  `mailto:${SITE.email}?subject=${encodeURIComponent('Join Easyfix as a service provider')}&body=${encodeURIComponent('Hi Easyfix, I would like to join as a service provider.\n\nName:\nService(s):\nArea(s):\nPhone:')}`

export function rand(n: number): string {
  return 'R' + n.toLocaleString('en-US').replace(/,/g, ' ')
}
