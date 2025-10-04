import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'HaloAudit - AI-Powered Compliance & Auditing Platform',
  description: 'Transform your business compliance with HaloAudit. AI-powered auditing that saves money, ensures accuracy, and automates compliance processes for modern businesses.',
  keywords: 'AI auditing, compliance automation, business compliance, cost savings, AI accuracy, audit software, compliance platform',
  authors: [{ name: 'HaloAudit Team' }],
  creator: 'HaloAudit',
  publisher: 'HaloAudit',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://haloaudit.com'),
  openGraph: {
    title: 'HaloAudit - AI-Powered Compliance & Auditing Platform',
    description: 'Transform your business compliance with HaloAudit. AI-powered auditing that saves money, ensures accuracy, and automates compliance processes for modern businesses.',
    url: 'https://haloaudit.com',
    siteName: 'HaloAudit',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'HaloAudit - AI-Powered Compliance & Auditing Platform',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HaloAudit - AI-Powered Compliance & Auditing Platform',
    description: 'Transform your business compliance with HaloAudit. AI-powered auditing that saves money, ensures accuracy, and automates compliance processes for modern businesses.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.className} antialiased`}>
        {children}
      </body>
    </html>
  )
}