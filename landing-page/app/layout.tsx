import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'HaloAudit - AI-Powered Document Analysis',
  description: 'Transform your document analysis with HaloAudit. AI-powered PDF and CSV processing with real-time insights and beautiful macOS integration.',
  keywords: 'AI, document analysis, PDF processing, CSV analysis, macOS app, machine learning',
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
    title: 'HaloAudit - AI-Powered Document Analysis',
    description: 'Transform your document analysis with HaloAudit. AI-powered PDF and CSV processing with real-time insights and beautiful macOS integration.',
    url: 'https://haloaudit.com',
    siteName: 'HaloAudit',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'HaloAudit - AI-Powered Document Analysis',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HaloAudit - AI-Powered Document Analysis',
    description: 'Transform your document analysis with HaloAudit. AI-powered PDF and CSV processing with real-time insights and beautiful macOS integration.',
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
