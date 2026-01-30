'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import PrivacyPage from '@/app/privacy/page'
import TermsPage from '@/app/terms/page'

type Mode = 'privacy' | 'terms' | null

export default function PolicyModal() {
  const [mode, setMode] = useState<Mode>(null)
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
    <div>
      {/* Keep footer fixed small triggers (optional) */}
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
        <div className="flex gap-4 text-sm text-muted-foreground">
          <button
            onClick={() => setMode('privacy')}
            className="underline text-xs"
          >
            Privacy Policy
          </button>
          <button
            onClick={() => setMode('terms')}
            className="underline text-xs"
          >
            Terms of Service
          </button>
        </div>
      </div>

      {/* Dialog instances rendered based on mode */}
      <Dialog open={mode === 'privacy'} onOpenChange={(open) => setMode(open ? 'privacy' : null)}>
        <DialogContent>
          <DialogTitle>Privacy Policy</DialogTitle>
          <DialogDescription />
          <div className="mt-4">
            <PrivacyPage />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={mode === 'terms'} onOpenChange={(open) => setMode(open ? 'terms' : null)}>
        <DialogContent>
          <DialogTitle>Terms of Service</DialogTitle>
          <DialogDescription />
          <div className="mt-4">
            <TermsPage />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
