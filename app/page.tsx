"use client"
import { useEffect, useState } from "react"
import DashboardLayout from "@/components/dashboard-layout"
import PatientDashboard from "@/components/patient-dashboard"
import ProviderDashboard from "@/components/provider-dashboard"
import { useDashboardRole } from "@/hooks/use-dashboard-role"

export default function DashboardPage() {
  const { role } = useDashboardRole()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent hydration mismatch
  if (!mounted) {
    return null
  }

  return (
    <DashboardLayout>
      {role === 'patient' && <PatientDashboard />}
      {(role === 'provider' || role === 'admin') && <ProviderDashboard />}
    </DashboardLayout>
  )
}
