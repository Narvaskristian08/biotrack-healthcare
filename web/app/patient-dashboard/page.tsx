'use client'

import DashboardLayout from '@/components/dashboard-layout'
import PatientDashboard from '@/components/patient-dashboard'

export default function PatientDashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PatientDashboard />
      </div>
    </DashboardLayout>
  )
}
