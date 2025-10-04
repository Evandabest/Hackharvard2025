'use client'

import { Suspense } from 'react'
import { Navigation } from '@/components/Navigation'
import { Hero } from '@/components/Hero'
import { Features } from '@/components/Features'
import { HowItWorks } from '@/components/HowItWorks'
import { Download } from '@/components/Download'
import { Footer } from '@/components/Footer'
import { ThreeScene } from '@/components/ThreeScene'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Background 3D Scene */}
      <div className="fixed inset-0 z-0">
        <Suspense fallback={<div className="w-full h-full bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900" />}>
          <ThreeScene />
        </Suspense>
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        <Navigation />
        <Hero />
        <Features />
        <HowItWorks />
        <Download />
        <Footer />
      </div>
    </main>
  )
}
