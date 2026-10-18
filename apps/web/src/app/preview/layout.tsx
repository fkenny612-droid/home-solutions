import type { Metadata } from 'next'
import '../legacy-fonts.css'

// Internal design preview with sample data — never shown in search results.
export const metadata: Metadata = {
  title: 'Platform preview',
  robots: { index: false, follow: false },
}

export default function PreviewLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
