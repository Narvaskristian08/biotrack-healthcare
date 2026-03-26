'use client'

import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react'
import { apiGet } from '@/lib/api'
import {
  getSession,
  clearSession,
  saveSession,
  logoutServerSession,
  USER_SESSION_CHANGED_EVENT,
  USER_SESSION_STORAGE_KEY,
  type AuthRole,
} from '@/lib/auth'

export type UserRole = 'patient' | 'provider' | 'admin'

interface SessionUser {
  email?: string
  name?: string
  firstName?: string
  lastName?: string
  role?: UserRole
  id?: string
  adminScope?: 'global' | 'municipal'
  adminCityMunicipality?: string
  adminCoverageTierId?: 'starter' | 'citywide' | 'enterprise'
  adminCoverageTierLabel?: string
}

interface DashboardRoleContextType {
  role: UserRole
  setRole: (role: UserRole) => void
  sessionUser: SessionUser | null
  isAuthenticated: boolean
  isReady: boolean
  logout: () => Promise<void>
}

const DashboardRoleContext = createContext<DashboardRoleContextType | undefined>(undefined)
const SESSION_HEARTBEAT_INTERVAL_MS = 4_000
const SESSION_HEARTBEAT_ACTIVITY_DEBOUNCE_MS = 400
const SESSION_HEARTBEAT_EVENTS: Array<keyof WindowEventMap> = [
  'mousemove',
  'mousedown',
  'keydown',
  'touchstart',
  'scroll',
  'wheel',
]

function mapAuthRoleToUserRole(authRole?: AuthRole | string): UserRole {
  if (authRole === 'patient') return 'patient'
  if (authRole === 'provider' || authRole === 'staff') return 'provider'
  if (authRole === 'admin') return 'admin'
  return 'patient'
}

export function DashboardRoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<UserRole>('patient')
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isReady, setIsReady] = useState(false)

  const syncFromSession = useCallback(() => {
    const session = getSession()
    if (session?.accessToken) {
      const mappedRole = mapAuthRoleToUserRole(session.role)
      setRoleState(mappedRole)
      setSessionUser({
        email: session.email,
        name: session.name,
        firstName: session.firstName,
        lastName: session.lastName,
        role: mappedRole,
        id: session.id,
        adminScope: session.adminScope,
        adminCityMunicipality: session.adminCityMunicipality,
        adminCoverageTierId: session.adminCoverageTierId,
        adminCoverageTierLabel: session.adminCoverageTierLabel,
      })
      setIsAuthenticated(true)
    } else {
      setIsAuthenticated(false)
      setSessionUser(null)
      setRoleState('patient')
    }
  }, [])

  useEffect(() => {
    syncFromSession()
    setIsReady(true)
    const onSessionChange = () => {
      syncFromSession()
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === USER_SESSION_STORAGE_KEY) {
        syncFromSession()
      }
    }

    window.addEventListener(USER_SESSION_CHANGED_EVENT, onSessionChange)
    window.addEventListener('storage', onStorage)

    return () => {
      window.removeEventListener(USER_SESSION_CHANGED_EVENT, onSessionChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [syncFromSession])

  useEffect(() => {
    if (!isReady || !isAuthenticated) return

    const currentSession = getSession()
    if (!currentSession?.accessToken) return
    if (currentSession.role !== 'patient' && currentSession.role !== 'provider') return

    let disposed = false
    let lastPingAt = 0
    let debounceTimer: number | null = null
    let intervalId: number | null = null

    const sendHeartbeat = async (force = false) => {
      if (disposed) return
      const latestSession = getSession()
      if (!latestSession?.accessToken) return
      if (latestSession.role !== 'patient' && latestSession.role !== 'provider') return

      const now = Date.now()
      if (!force && now - lastPingAt < SESSION_HEARTBEAT_INTERVAL_MS) return
      lastPingAt = now
      await apiGet<{ ok: boolean; serverTime: string }>('/auth/ping', {
        headers: {
          'x-biotrack-user-activity': '1',
        },
      })
    }

    const onActivity = () => {
      if (debounceTimer) return
      debounceTimer = window.setTimeout(() => {
        debounceTimer = null
        void sendHeartbeat(true)
      }, SESSION_HEARTBEAT_ACTIVITY_DEBOUNCE_MS)
    }

    const onVisibilityOrFocus = () => {
      if (document.visibilityState !== 'visible') return
      void sendHeartbeat(true)
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        onVisibilityOrFocus()
      }
    }

    SESSION_HEARTBEAT_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, onActivity, { passive: true })
    })
    window.addEventListener('focus', onVisibilityOrFocus)
    window.addEventListener('pageshow', onVisibilityOrFocus)
    document.addEventListener('visibilitychange', onVisibilityChange)

    intervalId = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      void sendHeartbeat(false)
    }, SESSION_HEARTBEAT_INTERVAL_MS)

    void sendHeartbeat(true)

    return () => {
      disposed = true
      if (debounceTimer) window.clearTimeout(debounceTimer)
      if (intervalId) window.clearInterval(intervalId)
      SESSION_HEARTBEAT_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, onActivity)
      })
      window.removeEventListener('focus', onVisibilityOrFocus)
      window.removeEventListener('pageshow', onVisibilityOrFocus)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [isAuthenticated, isReady])

  const setRole = (r: UserRole) => {
    setRoleState(r)
    setSessionUser((prev) => (prev ? { ...prev, role: r } : prev))
    const session = getSession()
    if (session) {
      saveSession({
        ...session,
        role: r as AuthRole,
      })
    }
  }

  const logout = async () => {
    await logoutServerSession()
    clearSession()
    setRoleState('patient')
    setSessionUser(null)
    setIsAuthenticated(false)
  }

  return (
    <DashboardRoleContext.Provider value={{ role, setRole, sessionUser, isAuthenticated, isReady, logout }}>
      {children}
    </DashboardRoleContext.Provider>
  )
}

export function useDashboardRole() {
  const context = useContext(DashboardRoleContext)
  if (!context) {
    throw new Error('useDashboardRole must be used within DashboardRoleProvider')
  }
  return context
}
