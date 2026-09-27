import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Truck Loads — Dispatch',
  description: 'Book loads, manage your fleet and plan truck-legal routes.',
}

export default function TruckLoadsLayout({ children }: { children: React.ReactNode }) {
  return children
}
