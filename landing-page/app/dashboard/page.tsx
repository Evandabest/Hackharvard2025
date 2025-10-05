'use client'

import { useState, useEffect } from 'react'
import { Suspense } from 'react'
import { Navigation } from '@/components/Navigation'
import { ThreeScene } from '@/components/ThreeScene'
import { 
  FileText, 
  Download, 
  Copy, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  TrendingUp,
  Shield,
  BarChart3,
  Sparkles
} from 'lucide-react'

interface AuditReport {
  runId: string
  tenantId: string
  source: string
  generated: string
  executiveSummary: {
    determination: {
      audit_standard: string
      opinion_type: string
      reasoning: string
    }
    report: {
      title_and_addressee: string
      opinion: string
      basis_for_opinion: string
      key_audit_matters: string
      responsibilities_of_management_and_governance: string
      auditor_responsibilities: string
      emphasis_of_matter: string | null
      other_matter: string | null
      other_information: string | null
      legal_and_regulatory: string | null
      signature_sign_off: string
    }
    machine_readable_summary_for_automation: {
      audit_standard: string
      opinion_type: string
      scope_limitation: boolean
      material_misstatement: boolean
      going_concern: boolean
      key_audit_matters: boolean
      other_information: boolean
      legal_regulatory: boolean
    }
  }
  findings: Array<{
    id: string
    code: string
    severity: string
    title: string
    detail: string
    evidence_r2_key?: string
  }>
  analysisMetadata: {
    textChunks: number
    vectorsIndexed: number
    transactionsReviewed: number
    mimeType: string
    generatedBy: string
  }
}

export default function Dashboard() {
  const [report, setReport] = useState<AuditReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Get runId from URL params
    const urlParams = new URLSearchParams(window.location.search)
    const runId = urlParams.get('runId')
    
    if (runId) {
      fetchReport(runId)
    } else {
      setError('No run ID provided')
      setLoading(false)
    }
  }, [])

  const fetchReport = async (runId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/fetch-report?runId=${runId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch report')
      }
      
      const data = await response.json()
      setReport(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch report')
    } finally {
      setLoading(false)
    }
  }

  const copyReport = async () => {
    if (!report) return
    
    try {
      const reportText = JSON.stringify(report, null, 2)
      await navigator.clipboard.writeText(reportText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy report:', err)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high': return 'text-red-400 bg-red-900/20 border-red-500/30'
      case 'medium': return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30'
      case 'low': return 'text-blue-400 bg-blue-900/20 border-blue-500/30'
      default: return 'text-gray-400 bg-gray-900/20 border-gray-500/30'
    }
  }

  const getOpinionColor = (opinion: string) => {
    switch (opinion.toLowerCase()) {
      case 'unmodified': return 'text-green-400 bg-green-900/20 border-green-500/30'
      case 'qualified': return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30'
      case 'adverse': return 'text-red-400 bg-red-900/20 border-red-500/30'
      case 'disclaimer': return 'text-orange-400 bg-orange-900/20 border-orange-500/30'
      default: return 'text-gray-400 bg-gray-900/20 border-gray-500/30'
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <div className="fixed inset-0 z-0">
          <Suspense fallback={<div className="w-full h-full bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900" />}>
            <ThreeScene />
          </Suspense>
        </div>
        
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="glass-effect rounded-2xl p-8 text-center">
            <div className="progress-ring mx-auto mb-4">
              <div className="progress-fill"></div>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Loading Audit Report</h2>
            <p className="text-gray-300">Please wait while we fetch your report...</p>
          </div>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <div className="fixed inset-0 z-0">
          <Suspense fallback={<div className="w-full h-full bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900" />}>
            <ThreeScene />
          </Suspense>
        </div>
        
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="glass-effect rounded-2xl p-8 text-center max-w-md">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Error Loading Report</h2>
            <p className="text-gray-300 mb-4">{error}</p>
            <button 
              onClick={() => window.location.href = '/'}
              className="btn-primary"
            >
              Return to Home
            </button>
          </div>
        </div>
      </main>
    )
  }

  if (!report) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <div className="fixed inset-0 z-0">
          <Suspense fallback={<div className="w-full h-full bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900" />}>
            <ThreeScene />
          </Suspense>
        </div>
        
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="glass-effect rounded-2xl p-8 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">No Report Found</h2>
            <p className="text-gray-300">The requested audit report could not be found.</p>
          </div>
        </div>
      </main>
    )
  }

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
        
        <div className="container mx-auto px-4 pt-24 pb-8">
          {/* Header */}
          <div className="glass-effect rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Audit Report</h1>
                <p className="text-gray-300">Generated by HaloAuditor</p>
              </div>
              <button
                onClick={copyReport}
                className="btn-secondary flex items-center space-x-2"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Report</span>
                  </>
                )}
              </button>
            </div>
            
            {/* Report Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Run ID:</span>
                <p className="text-white font-mono">{report.runId}</p>
              </div>
              <div>
                <span className="text-gray-400">Tenant ID:</span>
                <p className="text-white">{report.tenantId}</p>
              </div>
              <div>
                <span className="text-gray-400">Generated:</span>
                <p className="text-white">{new Date(report.generated).toLocaleString()}</p>
              </div>
              <div>
                <span className="text-gray-400">Source:</span>
                <p className="text-white truncate">{report.source.split('/').pop()}</p>
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="glass-effect rounded-2xl p-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <Sparkles className="w-6 h-6 mr-2 text-primary-400" />
              Executive Summary
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Determination */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Audit Determination</h3>
                <div className="space-y-3">
                  <div>
                    <span className="text-gray-400">Standard:</span>
                    <p className="text-white">{report.executiveSummary.determination.audit_standard}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Opinion:</span>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getOpinionColor(report.executiveSummary.determination.opinion_type)}`}>
                      {report.executiveSummary.determination.opinion_type}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Reasoning:</span>
                    <p className="text-white text-sm">{report.executiveSummary.determination.reasoning}</p>
                  </div>
                </div>
              </div>

              {/* Machine Readable Summary */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Automation Flags</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(report.executiveSummary.machine_readable_summary_for_automation).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${value ? 'bg-green-400' : 'bg-gray-400'}`}></div>
                      <span className="text-sm text-gray-300 capitalize">{key.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Professional Audit Report */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">Audit Report</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => window.print()}
                    className="btn-secondary flex items-center space-x-2 text-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span>Print</span>
                  </button>
                </div>
              </div>
              <div className="bg-white rounded-lg p-8 text-gray-900 shadow-xl">
                <div className="max-w-4xl mx-auto">
                  {/* Report Header */}
                  <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                      {report.executiveSummary.report.title_and_addressee.split('\n')[0]}
                    </h1>
                    <p className="text-gray-600">
                      {report.executiveSummary.report.title_and_addressee.split('\n').slice(1).join('\n')}
                    </p>
                  </div>

                  {/* Opinion Section */}
                  <div className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Opinion</h2>
                    <div className="prose prose-gray max-w-none">
                      <p className="text-gray-700 leading-relaxed">
                        {report.executiveSummary.report.opinion.split('\n').slice(1).join('\n')}
                      </p>
                    </div>
                  </div>

                  {/* Basis for Opinion */}
                  <div className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Basis for Opinion</h2>
                    <div className="prose prose-gray max-w-none">
                      <p className="text-gray-700 leading-relaxed">
                        {report.executiveSummary.report.basis_for_opinion}
                      </p>
                    </div>
                  </div>

                  {/* Key Audit Matters */}
                  {report.executiveSummary.report.key_audit_matters && 
                   !report.executiveSummary.report.key_audit_matters.includes('not applicable') && (
                    <div className="mb-8">
                      <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Audit Matters</h2>
                      <div className="prose prose-gray max-w-none">
                        <p className="text-gray-700 leading-relaxed">
                          {report.executiveSummary.report.key_audit_matters}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Responsibilities of Management */}
                  <div className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Responsibilities of Management and Governance</h2>
                    <div className="prose prose-gray max-w-none">
                      <p className="text-gray-700 leading-relaxed">
                        {report.executiveSummary.report.responsibilities_of_management_and_governance}
                      </p>
                    </div>
                  </div>

                  {/* Auditor's Responsibilities */}
                  <div className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Auditor's Responsibilities</h2>
                    <div className="prose prose-gray max-w-none">
                      <p className="text-gray-700 leading-relaxed">
                        {report.executiveSummary.report.auditor_responsibilities}
                      </p>
                    </div>
                  </div>

                  {/* Emphasis of Matter */}
                  {report.executiveSummary.report.emphasis_of_matter && (
                    <div className="mb-8">
                      <h2 className="text-xl font-semibold text-gray-900 mb-4">Emphasis of Matter</h2>
                      <div className="prose prose-gray max-w-none">
                        <p className="text-gray-700 leading-relaxed">
                          {report.executiveSummary.report.emphasis_of_matter}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Other Matter */}
                  {report.executiveSummary.report.other_matter && (
                    <div className="mb-8">
                      <h2 className="text-xl font-semibold text-gray-900 mb-4">Other Matter</h2>
                      <div className="prose prose-gray max-w-none">
                        <p className="text-gray-700 leading-relaxed">
                          {report.executiveSummary.report.other_matter}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Other Information */}
                  {report.executiveSummary.report.other_information && (
                    <div className="mb-8">
                      <h2 className="text-xl font-semibold text-gray-900 mb-4">Other Information</h2>
                      <div className="prose prose-gray max-w-none">
                        <p className="text-gray-700 leading-relaxed">
                          {report.executiveSummary.report.other_information}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Legal and Regulatory */}
                  {report.executiveSummary.report.legal_and_regulatory && (
                    <div className="mb-8">
                      <h2 className="text-xl font-semibold text-gray-900 mb-4">Legal and Regulatory</h2>
                      <div className="prose prose-gray max-w-none">
                        <p className="text-gray-700 leading-relaxed">
                          {report.executiveSummary.report.legal_and_regulatory}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Signature */}
                  <div className="mt-12 pt-8 border-t border-gray-300">
                    <div className="text-right">
                      <div className="text-gray-700">
                        {report.executiveSummary.report.signature_sign_off.split('\n').map((line, index) => (
                          <div key={index} className="mb-1">
                            {line}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Findings */}
          <div className="glass-effect rounded-2xl p-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <AlertCircle className="w-6 h-6 mr-2 text-yellow-400" />
              Findings ({report.findings.length})
            </h2>
            
            {report.findings.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <p className="text-xl text-white font-semibold">No significant findings detected.</p>
                <p className="text-gray-300 mt-2">The audit found no issues requiring attention.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {report.findings.map((finding, index) => (
                  <div key={finding.id || index} className="bg-gray-900/50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(finding.severity)}`}>
                          {finding.severity.toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-400 font-mono">{finding.code}</span>
                      </div>
                    </div>
                    <h4 className="text-white font-semibold mb-2">{finding.title}</h4>
                    <p className="text-gray-300 text-sm">{finding.detail}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Analysis Metadata */}
          <div className="glass-effect rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <BarChart3 className="w-6 h-6 mr-2 text-blue-400" />
              Analysis Metadata
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold text-white">{report.analysisMetadata.textChunks}</h3>
                <p className="text-gray-400 text-sm">Text Chunks</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <TrendingUp className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-2xl font-bold text-white">{report.analysisMetadata.vectorsIndexed}</h3>
                <p className="text-gray-400 text-sm">Vectors Indexed</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Shield className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-2xl font-bold text-white">{report.analysisMetadata.transactionsReviewed}</h3>
                <p className="text-gray-400 text-sm">Transactions Reviewed</p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-8 h-8 text-orange-400" />
                </div>
                <h3 className="text-2xl font-bold text-white">{report.analysisMetadata.mimeType.split('/')[1].toUpperCase()}</h3>
                <p className="text-gray-400 text-sm">File Type</p>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-700">
              <p className="text-gray-400 text-sm">
                Generated by {report.analysisMetadata.generatedBy}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
