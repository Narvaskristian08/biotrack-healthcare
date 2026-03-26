'use client'

import ProviderDashboard from '@/components/provider-dashboard'
import DashboardLayout from '@/components/dashboard-layout'

export default function ProviderDashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <ProviderDashboard />
      </div>
    </DashboardLayout>
  )
}
