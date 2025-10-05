'use client'

import { motion } from 'framer-motion'
import { Upload, Brain, BarChart3, ArrowRight } from 'lucide-react'

export function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Upload Audit Documents',
      description: 'Simply drag and drop your audit documents, financial records, or compliance files into HaloAudit. Our AI automatically detects document types and audit categories for analysis.',
      icon: Upload,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      number: '02',
      title: 'AI-Powered Audit Analysis',
      description: 'Our advanced AI algorithms analyze your documents across all 9 audit types for issues, violations, and potential risks with 99.9% accuracy, identifying problems humans might miss.',
      icon: Brain,
      color: 'from-purple-500 to-pink-500',
    },
    {
      number: '03',
      title: 'Get Comprehensive Reports',
      description: 'Receive detailed audit reports for any of the 9 audit types with clear recommendations, cost-saving opportunities, and actionable steps to improve your business operations.',
      icon: BarChart3,
      color: 'from-green-500 to-emerald-500',
    },
  ]

  return (
    <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-black/20">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            How It Works
          </h2>
          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            Simple steps to comprehensive audit reports for all 9 audit types
          </p>
        </motion.div>

        {/* Steps */}
        <div className="space-y-16">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: index * 0.2 }}
              viewport={{ once: true }}
              className={`flex flex-col lg:flex-row items-center gap-12 ${
                index % 2 === 1 ? 'lg:flex-row-reverse' : ''
              }`}
            >
              {/* Content */}
              <div className="flex-1 text-center lg:text-left">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.6, delay: index * 0.2 + 0.3 }}
                  viewport={{ once: true }}
                  className="mb-6"
                >
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 to-accent-500 rounded-2xl mb-4">
                    <step.icon className="w-10 h-10 text-white" />
                  </div>
                  <div className="text-6xl font-bold text-white/20 mb-4">
                    {step.number}
                  </div>
                </motion.div>

                <motion.h3
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.2 + 0.4 }}
                  viewport={{ once: true }}
                  className="text-3xl font-bold text-white mb-4"
                >
                  {step.title}
                </motion.h3>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.2 + 0.5 }}
                  viewport={{ once: true }}
                  className="text-lg text-white/80 leading-relaxed max-w-2xl"
                >
                  {step.description}
                </motion.p>
              </div>

              {/* Visual */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, delay: index * 0.2 + 0.6 }}
                viewport={{ once: true }}
                className="flex-1 max-w-md"
              >
                <div className="relative">
                  {/* Background glow */}
                  <div className={`absolute -inset-4 bg-gradient-to-br ${step.color} opacity-20 rounded-3xl blur-2xl`}></div>
                  
                  {/* Card */}
                  <div className="relative bg-gray-900/50 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
                    <div className="text-center">
                      <motion.div
                        animate={{ 
                          y: [0, -10, 0],
                          rotate: [0, 5, 0]
                        }}
                        transition={{ 
                          duration: 3,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                        className={`w-24 h-24 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center mx-auto mb-6`}
                      >
                        <step.icon className="w-12 h-12 text-white" />
                      </motion.div>
                      
                      <div className="space-y-3">
                        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full bg-gradient-to-r ${step.color} rounded-full`}
                            initial={{ width: '0%' }}
                            whileInView={{ width: '100%' }}
                            transition={{ duration: 2, delay: index * 0.5 + 1 }}
                            viewport={{ once: true }}
                          />
                        </div>
                        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full bg-gradient-to-r ${step.color} rounded-full`}
                            initial={{ width: '0%' }}
                            whileInView={{ width: '75%' }}
                            transition={{ duration: 2, delay: index * 0.5 + 1.2 }}
                            viewport={{ once: true }}
                          />
                        </div>
                        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full bg-gradient-to-r ${step.color} rounded-full`}
                            initial={{ width: '0%' }}
                            whileInView={{ width: '90%' }}
                            transition={{ duration: 2, delay: index * 0.5 + 1.4 }}
                            viewport={{ once: true }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Arrow (except for last step) */}
              {index < steps.length - 1 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: index * 0.2 + 0.8 }}
                  viewport={{ once: true }}
                  className="hidden lg:block absolute left-1/2 transform -translate-x-1/2 translate-y-32"
                >
                  <div className="w-12 h-12 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full flex items-center justify-center">
                    <ArrowRight className="w-6 h-6 text-white rotate-90" />
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}