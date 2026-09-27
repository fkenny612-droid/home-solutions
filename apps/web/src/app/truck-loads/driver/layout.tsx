import type { Metadata, Viewport } from 'next'

export const metadata: Metadata = {
  title: 'Truck Loads — Driver',
  description: 'Your assigned loads and truck routes.',
  appleWebApp: { capable: true, title: 'Truck Loads', statusBarStyle: 'black' },
}

export const viewport: Viewport = {
  themeColor: '#0C0A09',
  width: 'device-width',
  initialScale: 1,
}

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return children
}
