'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useDashboardRole, type UserRole } from '@/hooks/use-dashboard-role'
import { getSession, clearSession, resolveAuthenticatedHomePath } from '@/lib/auth'
import { apiGet, SESSION_TIMEOUT_EVENT, type SessionTimeoutEventDetail } from '@/lib/api'

const PUBLIC_PATHS = new Set([
  '/',
  '/about',
  '/account-verification',
  '/forgot-password',
  '/login',
  '/municipal-onboarding',
  '/privacy',
  '/register',
  '/terms',
])

const AUTH_PAGES = new Set(['/login', '/register', '/forgot-password'])

const COMMON_PROTECTED_PATHS = new Set([
  '/blockchain',
  '/blockchain-verification',
  '/help-support',
  '/settings',
])

const PATIENT_PATHS = new Set([
  '/patient-dashboard',
  '/ai-health-advisory',
  '/evaluation-feedback',
  '/health-monitoring',
  '/medical-records',
  '/profile-settings',
  '/reports-downloads',
  '/vitals-history',
])

const PROVIDER_PATHS = new Set([
  '/analytics',
  '/patients',
  '/provider-dashboard',
  '/provider-reports',
  '/records',
  '/users',
])

const ADMIN_PATHS = new Set(['/admin-dashboard'])
const ADMIN_GLOBAL_ONLY_PATHS = new Set([
  '/admin/ai-configuration',
  '/admin/backup-recovery',
  '/admin/municipal-onboarding',
])

const PATIENT_PREFIXES: string[] = []
const PROVIDER_PREFIXES = ['/users/', '/patients/']
const ADMIN_PREFIXES = ['/admin/']

function resolveHomePath(role: UserRole, adminScope: string = 'global') {
  return resolveAuthenticatedHomePath(role, adminScope === 'municipal' ? 'municipal' : 'global')
}

function hasPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some(prefix => pathname.startsWith(prefix))
}

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.has(pathname)
}

function isRoleAllowed(pathname: string, role: UserRole, adminScope: string = 'global') {
  if (COMMON_PROTECTED_PATHS.has(pathname)) return true

  if (role === 'patient') {
    return PATIENT_PATHS.has(pathname) || hasPrefix(pathname, PATIENT_PREFIXES)
  }

  if (role === 'provider') {
    return PROVIDER_PATHS.has(pathname) || hasPrefix(pathname, PROVIDER_PREFIXES)
  }

  if (adminScope === 'municipal' && ADMIN_GLOBAL_ONLY_PATHS.has(pathname)) {
    return false
  }

  return ADMIN_PATHS.has(pathname) || hasPrefix(pathname, ADMIN_PREFIXES)
}

export default function RouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { role, isAuthenticated, isReady, sessionUser } = useDashboardRole()
  const adminScope = sessionUser?.adminScope ?? 'global'
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null)
  const [timeoutMessage, setTimeoutMessage] = useState('')
  const timeoutHandledRef = useRef(false)
  const resumeCheckInFlightRef = useRef(false)
  const lastResumeAttemptAtRef = useRef(0)
  const finalizeTimeoutInFlightRef = useRef(false)

  const dismissTimeoutCountdown = useCallback(() => {
    timeoutHandledRef.current = false
    setTimeoutMessage('')
    setCountdownSeconds(null)
  }, [])

  useEffect(() => {
    const onSessionTimeout = (event: Event) => {
      if (timeoutHandledRef.current) return
      if (!getSession()?.accessToken) return

      const detail = (event as CustomEvent<SessionTimeoutEventDetail | undefined>).detail
      const nextCountdown =
        Number.isFinite(detail?.countdownSeconds) && Number(detail?.countdownSeconds) > 0
          ? Math.floor(Number(detail?.countdownSeconds))
          : 10

      timeoutHandledRef.current = true
      setTimeoutMessage(detail?.message || 'Session expired due to inactivity')
      setCountdownSeconds(nextCountdown)
    }

    window.addEventListener(SESSION_TIMEOUT_EVENT, onSessionTimeout as EventListener)
    return () => {
      window.removeEventListener(SESSION_TIMEOUT_EVENT, onSessionTimeout as EventListener)
    }
  }, [])

  useEffect(() => {
    if (countdownSeconds === null) return

    if (countdownSeconds <= 0) {
      if (finalizeTimeoutInFlightRef.current) return
      finalizeTimeoutInFlightRef.current = true
      void (async () => {
        try {
          const hasSession = Boolean(getSession()?.accessToken)
          if (hasSession) {
            const resume = await apiGet<{ ok: boolean; serverTime: string }>('/auth/ping', {
              headers: {
                'x-biotrack-user-activity': '1',
              },
            })
            if (!resume.error) {
              dismissTimeoutCountdown()
              return
            }
            if (resume.error.message) {
              setTimeoutMessage(resume.error.message)
            }
          }
          clearSession()
          dismissTimeoutCountdown()
          router.replace('/login?reason=session-timeout')
        } finally {
          finalizeTimeoutInFlightRef.current = false
        }
      })()
      return
    }

    const timerId = window.setTimeout(() => {
      setCountdownSeconds((previous) => (previous === null ? null : previous - 1))
    }, 1000)
    return () => {
      window.clearTimeout(timerId)
    }
  }, [countdownSeconds, dismissTimeoutCountdown, router])

  useEffect(() => {
    if (countdownSeconds === null) return

    const attemptResumeFromActivity = async (force = false) => {
      if (resumeCheckInFlightRef.current) return
      if (!getSession()?.accessToken) return
      const now = Date.now()
      if (!force && now - lastResumeAttemptAtRef.current < 800) return
      lastResumeAttemptAtRef.current = now
      resumeCheckInFlightRef.current = true

      try {
        const result = await apiGet<{ ok: boolean; serverTime: string }>('/auth/ping', {
          headers: {
            'x-biotrack-user-activity': '1',
          },
        })

        if (!result.error) {
          dismissTimeoutCountdown()
          return
        }

        if (result.error.status === 401) {
          // Keep countdown visible; redirect is handled by the countdown timer.
          if (result.error.message) setTimeoutMessage(result.error.message)
          return
        }

        dismissTimeoutCountdown()
      } finally {
        resumeCheckInFlightRef.current = false
      }
    }

    const handleActivity = () => {
      void attemptResumeFromActivity()
    }

    const handleVisibilityOrFocus = () => {
      void attemptResumeFromActivity(true)
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleVisibilityOrFocus()
      }
    }

    const activityEvents: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'wheel',
    ]

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true })
    })
    window.addEventListener('focus', handleVisibilityOrFocus)
    window.addEventListener('pageshow', handleVisibilityOrFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity)
      })
      window.removeEventListener('focus', handleVisibilityOrFocus)
      window.removeEventListener('pageshow', handleVisibilityOrFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [countdownSeconds, dismissTimeoutCountdown])

  useEffect(() => {
    if (isAuthenticated) return
    dismissTimeoutCountdown()
  }, [dismissTimeoutCountdown, isAuthenticated])

  useEffect(() => {
    if (!isReady) return

    if (isPublicPath(pathname)) {
      if (isAuthenticated && (AUTH_PAGES.has(pathname) || pathname === '/')) {
        router.replace(resolveHomePath(role, adminScope))
      }
      return
    }

    if (!isAuthenticated) {
      router.replace('/login')
      return
    }

    if (!isRoleAllowed(pathname, role, adminScope)) {
      router.replace(resolveHomePath(role, adminScope))
    }
  }, [isReady, isAuthenticated, pathname, role, router, adminScope])

  const shouldBlockProtectedRender =
    !isPublicPath(pathname) && (!isAuthenticated || !isRoleAllowed(pathname, role, adminScope))
  const shouldBlockAuthPageRender =
    isPublicPath(pathname) && isAuthenticated && AUTH_PAGES.has(pathname)

  if (!isReady || shouldBlockProtectedRender || shouldBlockAuthPageRender) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-primary/20 rounded-xl" />
          <div className="h-4 w-28 bg-muted rounded" />
        </div>
      </div>
    )
  }

  return (
    <>
      {children}
      {countdownSeconds !== null ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-destructive/30 bg-background p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-foreground">Session Timed Out</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {timeoutMessage || 'Session expired due to inactivity'}
            </p>
            <p className="mt-4 text-sm font-medium text-foreground">
              Redirecting to login in{' '}
              <span className="inline-flex min-w-8 items-center justify-center rounded-md bg-destructive/10 px-2 py-0.5 text-destructive">
                {countdownSeconds}
              </span>{' '}
              second{countdownSeconds === 1 ? '' : 's'}.
            </p>
          </div>
        </div>
      ) : null}
    </>
  )
}
