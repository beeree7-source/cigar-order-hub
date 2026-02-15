import './globals.css'
import { ReactNode } from 'react'

export const metadata = {
  title: 'Cigar Order Hub',
  description: 'B2B SaaS central ordering hub for cigar retailers and wholesalers',
}

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
