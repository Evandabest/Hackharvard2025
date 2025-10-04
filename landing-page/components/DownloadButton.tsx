'use client'

import { motion } from 'framer-motion'
import { Download, Monitor, Laptop } from 'lucide-react'

interface DownloadButtonProps {
  platform: 'mac' | 'windows'
}

export function DownloadButton({ platform }: DownloadButtonProps) {
  const isMac = platform === 'mac'
  
  const handleDownload = () => {
    // In a real app, this would trigger the actual download
    console.log(`Downloading for ${platform}`)
    
    // For demo purposes, show an alert
    alert(`Download for ${isMac ? 'macOS' : 'Windows'} would start here!`)
  }

  return (
    <motion.button
      onClick={handleDownload}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      className={`group relative overflow-hidden px-8 py-4 rounded-2xl font-semibold text-white transition-all duration-300 ${
        isMac
          ? 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700'
          : 'bg-gradient-to-r from-secondary-600 to-secondary-700 hover:from-secondary-700 hover:to-secondary-800'
      } shadow-xl hover:shadow-2xl`}
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 -top-1 -left-1 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
      
      <div className="relative flex items-center space-x-3">
        {isMac ? (
          <Laptop className="w-6 h-6" />
        ) : (
          <Monitor className="w-6 h-6" />
        )}
        <div className="text-left">
          <div className="text-lg font-bold">Download for {isMac ? 'Mac' : 'Windows'}</div>
          <div className="text-sm opacity-80">
            {isMac ? 'macOS 12.0 or later' : 'Windows 10 or later'}
          </div>
        </div>
        <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform duration-200" />
      </div>
    </motion.button>
  )
}