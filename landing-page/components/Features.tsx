'use client'

import { motion } from 'framer-motion'
import { 
  Brain, 
  DollarSign, 
  Shield, 
  Clock, 
  FileText, 
  BarChart3,
  Zap,
  Lock,
  Sparkles,
  Target,
  TrendingUp
} from 'lucide-react'

export function Features() {
  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Analysis',
      description: 'Advanced machine learning algorithms analyze audit documents across all 9 audit types with 99.9% accuracy, identifying issues humans might miss.',
      color: 'from-purple-500 to-pink-500',
    },
    {
      icon: DollarSign,
      title: 'Significant Cost Savings',
      description: 'Reduce audit costs by up to 60% through automated report generation across all audit types and reduced manual labor requirements.',
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Bank-grade security with end-to-end encryption ensures your sensitive audit data remains protected at all times.',
      color: 'from-red-500 to-orange-500',
    },
    {
      icon: Clock,
      title: 'Real-time Processing',
      description: 'Get instant audit insights with our optimized AI pipeline that delivers comprehensive reports in seconds, not days.',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: FileText,
      title: 'Multi-Format Support',
      description: 'Process PDFs, Excel files, CSV data, and more with intelligent content recognition for comprehensive audit coverage across all 9 audit types.',
      color: 'from-indigo-500 to-purple-500',
    },
    {
      icon: BarChart3,
      title: 'Actionable Insights',
      description: 'Transform raw audit data into clear, actionable reports that help you make informed business decisions across all audit types.',
      color: 'from-yellow-500 to-amber-500',
    },
    {
      icon: Target,
      title: 'Multi-Audit Support',
      description: 'Generate reports for Internal, External, Financial, Operational, Compliance, Information System, Payroll, and IRS Tax audits with automated monitoring.',
      color: 'from-pink-500 to-rose-500',
    },
    {
      icon: TrendingUp,
      title: 'Performance Analytics',
      description: 'Track audit metrics across all 9 audit types, identify trends, and optimize your audit processes with detailed analytics and reporting.',
      color: 'from-cyan-500 to-blue-500',
    },
    {
      icon: Zap,
      title: 'Automated Workflows',
      description: 'Streamline your audit processes across all 9 audit types with intelligent automation that reduces manual work and human error.',
      color: 'from-orange-500 to-red-500',
    },
  ]

  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
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
            Comprehensive Audit Features
          </h2>
          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            Everything you need for generating professional audit reports across all 9 major audit types
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ 
                scale: 1.05, 
                y: -10,
                transition: { duration: 0.2 }
              }}
              className="group relative"
            >
              {/* Card */}
              <div className="relative h-full p-8 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300">
                {/* Gradient overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300`}></div>
                
                {/* Icon */}
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                  className={`relative w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:shadow-lg group-hover:shadow-current/25 transition-all duration-300`}
                >
                  <feature.icon className="w-8 h-8 text-white" />
                </motion.div>

                {/* Content */}
                <div className="relative">
                  <h3 className="text-xl font-bold text-white mb-4 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-white/80 transition-all duration-300">
                    {feature.title}
                  </h3>
                  <p className="text-white/70 leading-relaxed group-hover:text-white/90 transition-colors duration-300">
                    {feature.description}
                  </p>
                </div>

                {/* Hover effect */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <div className="inline-flex items-center space-x-2 text-white/60">
            <Sparkles className="w-5 h-5" />
            <span>And much more coming soon...</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}