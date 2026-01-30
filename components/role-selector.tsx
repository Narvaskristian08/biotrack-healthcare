'use client'

import React from 'react'
import { Users, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDashboardRole, type UserRole } from '@/hooks/use-dashboard-role'

export default function RoleSelector() {
  const { role, setRole } = useDashboardRole()

  const roles: { value: UserRole; label: string; icon: React.ReactNode }[] = [
    { value: 'patient', label: 'Patient', icon: <User className="h-4 w-4" /> },
    { value: 'provider', label: 'Healthcare Provider', icon: <Users className="h-4 w-4" /> },
    { value: 'admin', label: 'Admin', icon: <Users className="h-4 w-4" /> },
  ]

  return (
    <div className="flex gap-2 items-center">
      {roles.map((r) => (
        <Button
          key={r.value}
          variant={role === r.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => setRole(r.value)}
          className="gap-2"
        >
          {r.icon}
          <span className="hidden sm:inline">{r.label}</span>
          <span className="sm:hidden">{r.label.split(' ')[0]}</span>
        </Button>
      ))}
    </div>
  )
}
