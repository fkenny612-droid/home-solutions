import type { MetadataRoute } from 'next'
import { SERVICE_PAGES } from '@/lib/service-pages'
import { siteUrl } from '@/lib/site'

// No lastModified: it would change on every build whether or not a page did, and Google ignores untrustworthy dates.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl()
  return [
    { url: base },
    ...SERVICE_PAGES.map(s => ({ url: `${base}/services/${s.slug}` })),
    { url: `${base}/for-service-providers` },
    { url: `${base}/terms` },
    { url: `${base}/privacy` },
    { url: `${base}/delete-account` },
  ]
}
