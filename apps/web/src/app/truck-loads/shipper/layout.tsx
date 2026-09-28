import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Shippers — Truck Loads',
  description: 'Post loads and get quotes from verified carriers.',
}

export default function ShipperLayout({ children }: { children: React.ReactNode }) {
  return children
}
