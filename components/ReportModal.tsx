'use client'

import { useState, useEffect } from 'react'
import { X, Bug, Lightbulb, Code, Send, AlertCircle, CheckCircle } from 'lucide-react'

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
}

type ReportType = 'bug' | 'suggestion' | 'development'

export default function ReportModal({ isOpen, onClose }: ReportModalProps) {
  const [type, setType] = useState<ReportType>('bug')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setType('bug')
      setTitle('')
      setDescription('')
      setError('')
      setSuccess(false)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      // Get auth token from localStorage
      const authToken = localStorage.getItem('authToken')
      
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        },
        credentials: 'include',
        body: JSON.stringify({
          type,
          title,
          description
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit report')
      }

      setSuccess(true)
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to submit report')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const typeConfig = {
    bug: {
      icon: Bug,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20',
      label: 'Bug Report',
      placeholder: 'Describe the bug you encountered...'
    },
    suggestion: {
      icon: Lightbulb,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/20',
      label: 'Suggestion',
      placeholder: 'Share your idea or suggestion...'
    },
    development: {
      icon: Code,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20',
      label: 'Development',
      placeholder: 'Describe the feature or improvement...'
    }
  }

  const currentConfig = typeConfig[type]
  const Icon = currentConfig.icon

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full border border-gray-800 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Submit Report</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
            <p className="text-lg text-white font-medium">Report submitted successfully!</p>
            <p className="text-gray-400 text-sm mt-2">Thank you for your feedback.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Report Type Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Report Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(typeConfig) as ReportType[]).map((reportType) => {
                  const config = typeConfig[reportType]
                  const TypeIcon = config.icon
                  return (
                    <button
                      key={reportType}
                      type="button"
                      onClick={() => setType(reportType)}
                      className={`p-3 rounded-lg border transition-all ${
                        type === reportType
                          ? `${config.bgColor} ${config.borderColor} border-2`
                          : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                      }`}
                    >
                      <TypeIcon className={`w-5 h-5 mx-auto mb-1 ${
                        type === reportType ? config.color : 'text-gray-400'
                      }`} />
                      <span className={`text-xs ${
                        type === reportType ? 'text-white font-medium' : 'text-gray-400'
                      }`}>
                        {config.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Title Input */}
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium text-gray-300">
                Title
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
                placeholder="Brief summary of your report"
                maxLength={100}
                required
              />
              <span className="text-xs text-gray-500">{title.length}/100</span>
            </div>

            {/* Description Input */}
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium text-gray-300">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 resize-none"
                placeholder={currentConfig.placeholder}
                rows={6}
                maxLength={1000}
                required
              />
              <span className="text-xs text-gray-500">{description.length}/1000</span>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 text-red-500 text-sm bg-red-500/10 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !title || !description}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                isSubmitting || !title || !description
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : `${currentConfig.bgColor} ${currentConfig.color} hover:opacity-80`
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Submit Report</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}