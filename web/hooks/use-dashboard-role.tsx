'use client'

import { createContext, useContext, ReactNode, useState, useEffect } from 'react'
import { getSession, clearSession, type AuthRole } from '@/lib/auth'

export type UserRole = 'patient' | 'provider' | 'admin'

interface SessionUser {
  email?: string
  name?: string
  firstName?: string
  lastName?: string
  role?: UserRole
  id?: string
}

interface DashboardRoleContextType {
  role: UserRole
  setRole: (role: UserRole) => void
  sessionUser: SessionUser | null
  isAuthenticated: boolean
  isReady: boolean
  logout: () => void
}

const DashboardRoleContext = createContext<DashboardRoleContextType | undefined>(undefined)

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

  useEffect(() => {
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
      })
      setIsAuthenticated(true)
    } else {
      setIsAuthenticated(false)
      setSessionUser(null)
    }
    setIsReady(true)
  }, [])

  const setRole = (r: UserRole) => {
    setRoleState(r)
    // Update localStorage if needed
    const session = getSession()
    if (session) {
      session.role = r as AuthRole
      localStorage.setItem('userSession', JSON.stringify(session))
    }
  }

  const logout = () => {
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
