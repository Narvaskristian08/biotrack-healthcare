'use client'

import { createContext, useContext, ReactNode, useState, useEffect } from 'react'

export type UserRole = 'patient' | 'provider' | 'admin'

interface DashboardRoleContextType {
  role: UserRole
  setRole: (role: UserRole) => void
  sessionUser: { email?: string; name?: string; role?: string } | null
}

const DashboardRoleContext = createContext<DashboardRoleContextType | undefined>(undefined)

function getSessionRole(): UserRole {
  if (typeof window === 'undefined') return 'patient'
  try {
    const raw = localStorage.getItem('userSession')
    if (!raw) return 'patient'
    const session = JSON.parse(raw)
    const r = session?.role?.toLowerCase()
    if (r === 'patient' || r === 'provider' || r === 'admin') return r
    return 'patient'
  } catch {
    return 'patient'
  }
}

export function DashboardRoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<UserRole>('patient')
  const [sessionUser, setSessionUser] = useState<{ email?: string; name?: string; role?: string } | null>(null)

  useEffect(() => {
    const r = getSessionRole()
    setRoleState(r)
    try {
      const raw = localStorage.getItem('userSession')
      if (raw) setSessionUser(JSON.parse(raw))
    } catch {
      setSessionUser(null)
    }
  }, [])

  const setRole = (r: UserRole) => {
    setRoleState(r)
    try {
      const raw = localStorage.getItem('userSession')
      if (raw) {
        const session = JSON.parse(raw)
        localStorage.setItem('userSession', JSON.stringify({ ...session, role: r }))
      }
    } catch {
      // ignore
    }
  }

  return (
    <DashboardRoleContext.Provider value={{ role, setRole, sessionUser }}>
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
