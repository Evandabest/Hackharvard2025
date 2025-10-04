'use client'

import { motion } from 'framer-motion'
import { Download as DownloadIcon, CheckCircle, Shield, Zap, Laptop, Monitor } from 'lucide-react'
import { DownloadButton } from './DownloadButton'

export function Download() {
  const features = [
    { icon: CheckCircle, text: 'Free to download' },
    { icon: Shield, text: 'Secure & Private' },
    { icon: Zap, text: 'Lightning Fast' },
  ]

  return (
    <section id="download" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center lg:text-left"
          >
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
              Ready to Transform Your{' '}
              <span className="gradient-text">Document Analysis?</span>
            </h2>
            
            <p className="text-xl text-white/80 mb-8 max-w-2xl">
              Download HaloAudit today and experience the future of intelligent document processing.
            </p>

            {/* Download Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <DownloadButton platform="mac" />
              <DownloadButton platform="windows" />
            </div>

            {/* Features */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.text}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="flex items-center space-x-2 text-white/80"
                >
                  <feature.icon className="w-5 h-5 text-primary-400" />
                  <span className="text-sm font-medium">{feature.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right Content - App Showcase */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="relative">
              {/* Background glow */}
              <div className="absolute -inset-8 bg-gradient-to-r from-primary-500/20 to-accent-500/20 rounded-3xl blur-3xl"></div>
              
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
                    {/* Analysis Demo */}
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.6, delay: 0.4 }}
                      viewport={{ once: true }}
                      className="bg-gray-800/50 rounded-xl p-6 border border-gray-700"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-lg font-semibold text-white">Analysis Complete</h4>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-sm text-green-400 font-medium">Success</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.6, delay: 0.6 }}
                          viewport={{ once: true }}
                          className="flex items-center justify-between py-2 border-b border-gray-700/50"
                        >
                          <span className="text-white/60 text-sm">Key Insights</span>
                          <span className="text-primary-400 font-semibold">12 found</span>
                        </motion.div>
                        
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.6, delay: 0.7 }}
                          viewport={{ once: true }}
                          className="flex items-center justify-between py-2 border-b border-gray-700/50"
                        >
                          <span className="text-white/60 text-sm">Processing Time</span>
                          <span className="text-green-400 font-semibold">2.3s</span>
                        </motion.div>
                        
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.6, delay: 0.8 }}
                          viewport={{ once: true }}
                          className="flex items-center justify-between py-2"
                        >
                          <span className="text-white/60 text-sm">Confidence</span>
                          <span className="text-accent-400 font-semibold">98.5%</span>
                        </motion.div>
                      </div>
                    </motion.div>

                    {/* Progress Bars */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.9 }}
                      viewport={{ once: true }}
                      className="space-y-3"
                    >
                      <div className="text-sm text-white/60 mb-2">Processing Progress</div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-white/60">
                          <span>Text Extraction</span>
                          <span>100%</span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"
                            initial={{ width: '0%' }}
                            whileInView={{ width: '100%' }}
                            transition={{ duration: 2, delay: 1 }}
                            viewport={{ once: true }}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-white/60">
                          <span>AI Analysis</span>
                          <span>100%</span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-accent-500 to-purple-500 rounded-full"
                            initial={{ width: '0%' }}
                            whileInView={{ width: '100%' }}
                            transition={{ duration: 2, delay: 1.2 }}
                            viewport={{ once: true }}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-white/60">
                          <span>Report Generation</span>
                          <span>100%</span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                            initial={{ width: '0%' }}
                            whileInView={{ width: '100%' }}
                            transition={{ duration: 2, delay: 1.4 }}
                            viewport={{ once: true }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
