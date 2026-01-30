'use client'

import { createContext, useContext, ReactNode, useState } from 'react'

export type UserRole = 'patient' | 'provider' | 'admin'

interface DashboardRoleContextType {
  role: UserRole
  setRole: (role: UserRole) => void
}

const DashboardRoleContext = createContext<DashboardRoleContextType | undefined>(undefined)

export function DashboardRoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<UserRole>('patient')

  return (
    <DashboardRoleContext.Provider value={{ role, setRole }}>
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
