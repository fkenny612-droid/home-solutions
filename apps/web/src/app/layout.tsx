import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Home Solutions — Home Services Marketplace',
  description: 'Vetted marketplace connecting homeowners with certified plumbers, electricians, cleaners, and tradespeople in Durban, KZN.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
