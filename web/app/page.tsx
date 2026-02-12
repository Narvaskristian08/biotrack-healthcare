"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import DashboardLayout from "@/components/dashboard-layout"
import PatientDashboard from "@/components/patient-dashboard"
import ProviderDashboard from "@/components/provider-dashboard"
import { useDashboardRole } from "@/hooks/use-dashboard-role"
import { getSession } from "@/lib/auth"

export default function DashboardPage() {
  const router = useRouter()
  const { role, isAuthenticated } = useDashboardRole()
  const [mounted, setMounted] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    setMounted(true)

    // Check auth on mount
    const session = getSession()
    if (!session || !session.accessToken) {
      router.replace('/login')
      return
    }
    setChecking(false)
  }, [router])

  // Prevent hydration mismatch and show nothing while checking auth
  if (!mounted || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-primary/20 rounded-xl" />
          <div className="h-4 w-24 bg-muted rounded" />
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout>
      {role === 'patient' && <PatientDashboard />}
      {(role === 'provider' || role === 'admin') && <ProviderDashboard />}
    </DashboardLayout>
  )
}
