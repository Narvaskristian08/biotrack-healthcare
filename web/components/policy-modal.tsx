'use client'

import React, { useMemo, useState } from 'react'
import { FileText, ShieldCheck } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

type Mode = 'privacy' | 'terms' | null

const PRIVACY_SECTIONS = [
  {
    title: 'Data We Collect',
    body: 'We collect only the information needed to provide healthcare services: account details, patient profile data, and consented health records.',
  },
  {
    title: 'How Data Is Used',
    body: 'Data is used for account access, patient monitoring, record review, and clinical coordination between authorized healthcare personnel.',
  },
  {
    title: 'Security and Protection',
    body: 'We apply role-based access controls, encrypted transport, audit logging, and secure storage measures to protect sensitive information.',
  },
  {
    title: 'Data Sharing',
    body: 'We do not sell personal data. Information is shared only with authorized care teams, system administrators, or when required by law.',
  },
]

const TERMS_SECTIONS = [
  {
    title: 'Service Scope',
    body: 'BioTrack supports healthcare workflows and monitoring. It is not a replacement for emergency response or direct professional medical diagnosis.',
  },
  {
    title: 'Account Responsibility',
    body: 'Users are responsible for account credentials, accurate data entry, and compliance with applicable health and data protection rules.',
  },
  {
    title: 'Acceptable Use',
    body: 'Unauthorized access attempts, misuse of patient data, data scraping, and platform abuse are strictly prohibited.',
  },
  {
    title: 'Liability Limits',
    body: 'To the extent allowed by law, service providers are not liable for indirect or consequential damages resulting from platform misuse or outages.',
  },
]

export default function PolicyModal() {
  const [mode, setMode] = useState<Mode>(null)

  const activeMode = mode ?? 'privacy'
  const sections = useMemo(() => {
    return activeMode === 'privacy' ? PRIVACY_SECTIONS : TERMS_SECTIONS
  }, [activeMode])

  React.useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent)?.detail
      if (detail && (detail.mode === 'privacy' || detail.mode === 'terms')) {
        setMode(detail.mode)
      }
    }

    window.addEventListener('openPolicy', handler as EventListener)
    return () => window.removeEventListener('openPolicy', handler as EventListener)
  }, [])

  return (
    <Dialog open={mode !== null} onOpenChange={(open) => setMode(open ? activeMode : null)}>
      <DialogContent className="w-full max-w-4xl overflow-hidden rounded-2xl border border-[#c7e6d7] bg-white p-0 shadow-[0_30px_70px_rgba(8,35,25,0.24)]">
        <div className="border-b border-[#d9ede2] bg-linear-to-r from-[#effaf4] to-[#ffffff] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <DialogTitle className="text-xl text-[#15392b]">
                {activeMode === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
              </DialogTitle>
              <DialogDescription className="text-sm text-[#5b786d]">
                Last updated: February 16, 2026
              </DialogDescription>
            </div>
            <div className="rounded-full bg-[#e9f8f0] p-2.5 text-[#0f8f60]">
              {activeMode === 'privacy' ? (
                <ShieldCheck className="h-5 w-5" />
              ) : (
                <FileText className="h-5 w-5" />
              )}
            </div>
          </div>

          <div className="mt-4 inline-flex rounded-lg border border-[#cfe5d9] bg-white p-1">
            <button
              type="button"
              onClick={() => setMode('privacy')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${activeMode === 'privacy'
                  ? 'bg-[#0f8f60] text-white'
                  : 'text-[#567368] hover:bg-[#f3faf6]'
                }`}
            >
              Privacy Policy
            </button>
            <button
              type="button"
              onClick={() => setMode('terms')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${activeMode === 'terms'
                  ? 'bg-[#0f8f60] text-white'
                  : 'text-[#567368] hover:bg-[#f3faf6]'
                }`}
            >
              Terms of Service
            </button>
          </div>
        </div>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-xl border border-[#d9ede2] bg-[#fbfefd] px-4 py-3"
            >
              <h3 className="text-sm font-semibold text-[#163f30]">{section.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[#4f6f63]">{section.body}</p>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
