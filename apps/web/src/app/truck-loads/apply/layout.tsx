import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Apply — Truck Loads',
  description: 'Submit your truck, driver details and compliance documents.',
  // Links are private to each dispatcher; keep them out of search engines
  robots: { index: false, follow: false },
}

export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return children
}
