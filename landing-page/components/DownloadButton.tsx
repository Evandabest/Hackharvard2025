'use client'

import { motion } from 'framer-motion'
import { Download, Monitor, Laptop, ExternalLink, Play, X } from 'lucide-react'
import { useState } from 'react'

interface DownloadButtonProps {
  platform: 'mac' | 'windows'
}

export function DownloadButton({ platform }: DownloadButtonProps) {
  const isMac = platform === 'mac'
  const [isDownloading, setIsDownloading] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  
  const handleDownload = async () => {
    setIsDownloading(true)
    
    try {
      // Fetch download information from our API
      const response = await fetch(`/api/download?platform=${platform}`)
      const downloadInfo = await response.json()
      
      if (response.ok) {
        // Show instructions modal
        setShowInstructions(true)
      } else {
        alert(`Error: ${downloadInfo.error}`)
      }
    } catch (error) {
      console.error('Download error:', error)
      alert('Failed to get download information')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleStartServices = async () => {
    try {
      const response = await fetch('/api/start-services', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          services: ['backend', 'agent', 'landing-page']
        })
      })
      
      const result = await response.json()
      
      if (response.ok) {
        alert('Services are starting up! Check your terminal for output.')
      } else {
        alert(`Error starting services: ${result.error}`)
      }
    } catch (error) {
      console.error('Service startup error:', error)
      alert('Failed to start services')
    }
  }

  const getInstructions = () => {
    if (isMac) {
      return [
        '1. Clone the repository: git clone https://github.com/Evandabest/Hackharvard2025',
        '2. Navigate to swift-frontend: cd swift-frontend',
        '3. Open the project: open boringNotch.xcodeproj',
        '4. Build and run in Xcode',
        '5. Or use the build script: ./build_and_run.sh'
      ]
    } else {
      return [
        '1. Clone the repository: git clone https://github.com/Evandabest/Hackharvard2025',
        '2. Navigate to windows-frontend: cd windows-frontend',
        '3. Install dependencies: npm install',
        '4. Build the application: npm run build',
        '5. Run the application: npm start'
      ]
    }
  }

  return (
    <>
      <motion.button
        onClick={handleDownload}
        disabled={isDownloading}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95 }}
        className={`group relative overflow-hidden px-8 py-4 rounded-2xl font-semibold text-white transition-all duration-300 ${
          isMac
            ? 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700'
            : 'bg-gradient-to-r from-secondary-600 to-secondary-700 hover:from-secondary-700 hover:to-secondary-800'
        } shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed`}
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
            <div className="text-lg font-bold">
              {isDownloading ? 'Getting Instructions...' : `Download for ${isMac ? 'Mac' : 'Windows'}`}
            </div>
            <div className="text-sm opacity-80">
              {isMac ? 'macOS 12.0 or later' : 'Windows 10 or later'}
            </div>
          </div>
          {isDownloading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform duration-200" />
          )}
        </div>
      </motion.button>

      {/* Instructions Modal */}
      {showInstructions && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-gray-700"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">
                Setup Instructions for {isMac ? 'macOS' : 'Windows'}
              </h3>
              <button
                onClick={() => setShowInstructions(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {getInstructions().map((instruction, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <code className="text-green-400 bg-gray-800 px-3 py-2 rounded-lg text-sm flex-1">
                    {instruction}
                  </code>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <motion.button
                onClick={handleStartServices}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center justify-center space-x-2 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300"
              >
                <Play className="w-5 h-5" />
                <span>Start All Services</span>
              </motion.button>

              <motion.button
                onClick={() => window.open('https://github.com/Evandabest/Hackharvard2025', '_blank')}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center justify-center space-x-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 border border-gray-600"
              >
                <ExternalLink className="w-5 h-5" />
                <span>View on GitHub</span>
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}