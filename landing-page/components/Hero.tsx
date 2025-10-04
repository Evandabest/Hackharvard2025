'use client'

import { motion } from 'framer-motion'
import { Download, Zap, Shield, Clock } from 'lucide-react'
import { DownloadButton } from './DownloadButton'

export function Hero() {
  const stats = [
    { number: '99.9%', label: 'Accuracy', icon: Shield },
    { number: '2.3s', label: 'Avg Processing', icon: Clock },
    { number: '10K+', label: 'Files Analyzed', icon: Zap },
  ]

  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-20">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        {/* Left Content */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-center lg:text-left"
        >
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6"
          >
            <span className="block">AI-Powered</span>
            <span className="block">Document</span>
            <span className="block gradient-text">Analysis</span>
            <span className="block text-2xl sm:text-3xl lg:text-4xl font-normal text-white/80 mt-4">
              Made Beautiful
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-lg sm:text-xl text-white/80 mb-8 max-w-2xl"
          >
            Transform your PDF and CSV files into actionable insights with HaloAudit. 
            Experience seamless AI-powered analysis with stunning macOS integration.
          </motion.p>

          {/* Download Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 mb-12"
          >
            <DownloadButton platform="mac" />
            <DownloadButton platform="windows" />
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="grid grid-cols-3 gap-8"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 1 + index * 0.1 }}
                className="text-center"
              >
                <div className="flex justify-center mb-2">
                  <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-accent-500 rounded-xl flex items-center justify-center">
                    <stat.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-white mb-1">{stat.number}</div>
                <div className="text-sm text-white/60">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Right Content - App Preview */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="relative"
        >
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute -inset-4 bg-gradient-to-r from-primary-500/20 to-accent-500/20 rounded-3xl blur-2xl"></div>
            
            {/* App Window */}
            <motion.div
              whileHover={{ scale: 1.02, rotateY: 5 }}
              transition={{ duration: 0.3 }}
              className="relative bg-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-700"
            >
              {/* Window Header */}
              <div className="bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <div className="text-white/60 text-sm font-medium">HaloAudit</div>
                <div className="w-12"></div>
              </div>

              {/* Window Content */}
              <div className="p-8">
                <div className="space-y-6">
                  {/* File Drop Zone */}
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 1.2 }}
                    className="border-2 border-dashed border-primary-500/50 rounded-xl p-8 text-center bg-primary-500/5"
                  >
                    <Download className="w-12 h-12 text-primary-400 mx-auto mb-4" />
                    <p className="text-white/80 text-lg font-medium">
                      Drop PDF or CSV files here
                    </p>
                    <p className="text-white/60 text-sm mt-2">
                      Drag and drop to get started
                    </p>
                  </motion.div>

                  {/* Processing Animation */}
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 1.4 }}
                    className="flex items-center justify-center space-x-3"
                  >
                    <div className="relative w-8 h-8">
                      <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary-500 animate-spin"></div>
                    </div>
                    <span className="text-white/80 font-medium">Analyzing...</span>
                  </motion.div>

                  {/* Results Preview */}
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 1.6 }}
                    className="bg-gray-800 rounded-xl p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-white/60 text-sm">Key Insights</span>
                      <span className="text-primary-400 font-semibold">12 found</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60 text-sm">Processing Time</span>
                      <span className="text-green-400 font-semibold">2.3s</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/60 text-sm">Confidence</span>
                      <span className="text-accent-400 font-semibold">98.5%</span>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
