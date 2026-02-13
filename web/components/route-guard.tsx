'use client'

import { useEffect, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useDashboardRole, type UserRole } from '@/hooks/use-dashboard-role'

const PUBLIC_PATHS = new Set([
  '/about',
  '/account-verification',
  '/forgot-password',
  '/login',
  '/privacy',
  '/register',
  '/terms',
])

const AUTH_PAGES = new Set(['/login', '/register', '/forgot-password'])

const COMMON_PROTECTED_PATHS = new Set([
  '/',
  '/blockchain',
  '/blockchain-verification',
  '/help-support',
  '/settings',
])

const PATIENT_PATHS = new Set([
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

const PATIENT_PREFIXES: string[] = []
const PROVIDER_PREFIXES = ['/users/', '/patients/']
const ADMIN_PREFIXES = ['/admin/']

function hasPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some(prefix => pathname.startsWith(prefix))
}

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.has(pathname)
}

function isRoleAllowed(pathname: string, role: UserRole) {
  if (COMMON_PROTECTED_PATHS.has(pathname)) return true

  if (role === 'patient') {
    return PATIENT_PATHS.has(pathname) || hasPrefix(pathname, PATIENT_PREFIXES)
  }

  if (role === 'provider') {
    return PROVIDER_PATHS.has(pathname) || hasPrefix(pathname, PROVIDER_PREFIXES)
  }

  return (
    ADMIN_PATHS.has(pathname) ||
    PROVIDER_PATHS.has(pathname) ||
    hasPrefix(pathname, ADMIN_PREFIXES) ||
    hasPrefix(pathname, PROVIDER_PREFIXES)
  )
}

export default function RouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { role, isAuthenticated, isReady } = useDashboardRole()

  useEffect(() => {
    if (!isReady) return

    if (isPublicPath(pathname)) {
      if (isAuthenticated && AUTH_PAGES.has(pathname)) {
        router.replace('/')
      }
      return
    }

    if (!isAuthenticated) {
      router.replace('/login')
      return
    }

    if (!isRoleAllowed(pathname, role)) {
      router.replace('/')
    }
  }, [isReady, isAuthenticated, pathname, role, router])

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-primary/20 rounded-xl" />
          <div className="h-4 w-28 bg-muted rounded" />
        </div>
      </div>
    )
  }

  return <>{children}</>
}
