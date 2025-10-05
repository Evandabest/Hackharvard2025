'use client'

import { motion } from 'framer-motion'
import { 
  Search, 
  Building2, 
  Calculator, 
  Cog, 
  Shield, 
  Database, 
  Users, 
  Receipt,
  FileText
} from 'lucide-react'

export function AuditTypes() {
  const auditTypes = [
    {
      icon: Search,
      title: 'Internal',
      description: 'Internal control assessments and operational efficiency reviews',
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Building2,
      title: 'External',
      description: 'Independent third-party audits and verification services',
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: Receipt,
      title: 'IRS Tax',
      description: 'Tax compliance audits and regulatory tax reporting',
      color: 'from-red-500 to-pink-500',
    },
    {
      icon: Calculator,
      title: 'Financial',
      description: 'Financial statement audits and accounting accuracy reviews',
      color: 'from-purple-500 to-violet-500',
    },
    {
      icon: Cog,
      title: 'Operational',
      description: 'Business process audits and operational efficiency assessments',
      color: 'from-orange-500 to-amber-500',
    },
    {
      icon: Shield,
      title: 'Compliance',
      description: 'Regulatory compliance audits and policy adherence reviews',
      color: 'from-indigo-500 to-blue-500',
    },
    {
      icon: Database,
      title: 'Information System',
      description: 'IT security audits and system integrity assessments',
      color: 'from-teal-500 to-cyan-500',
    },
    {
      icon: Users,
      title: 'Payroll',
      description: 'Payroll accuracy audits and employee compensation reviews',
      color: 'from-pink-500 to-rose-500',
    },
    {
      icon: FileText,
      title: 'Pay',
      description: 'Payment processing audits and transaction verification',
      color: 'from-yellow-500 to-orange-500',
    },
  ]

  return (
    <section id="audit-types" className="py-20 px-4 sm:px-6 lg:px-8">
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
            All 9 Major Audit Types
          </h2>
          <p className="text-xl text-white/80 max-w-3xl mx-auto">
            Generate comprehensive reports for every type of audit your business needs
          </p>
        </motion.div>

        {/* Audit Types Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {auditTypes.map((audit, index) => (
            <motion.div
              key={audit.title}
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
                <div className={`absolute inset-0 bg-gradient-to-br ${audit.color} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-300`}></div>
                
                {/* Icon */}
                <motion.div
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                  className={`relative w-16 h-16 bg-gradient-to-br ${audit.color} rounded-2xl flex items-center justify-center mb-6 group-hover:shadow-lg group-hover:shadow-current/25 transition-all duration-300`}
                >
                  <audit.icon className="w-8 h-8 text-white" />
                </motion.div>

                {/* Content */}
                <div className="relative">
                  <h3 className="text-xl font-bold text-white mb-4 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-white/80 transition-all duration-300">
                    {audit.title}
                  </h3>
                  <p className="text-white/70 leading-relaxed group-hover:text-white/90 transition-colors duration-300">
                    {audit.description}
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
            <Search className="w-5 h-5" />
            <span>Comprehensive audit coverage for every business need</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
