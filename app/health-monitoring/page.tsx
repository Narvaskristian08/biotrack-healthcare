'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { mockPatientVitals } from '@/lib/mock-data'
import { useMemo } from 'react'

export default function HealthMonitoringPage() {
  const trends = useMemo(() => {
    return mockPatientVitals
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Health Monitoring</h1>
        <p className="text-muted-foreground mt-1">Comparative trends, flagged abnormal patterns and historical insights</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Abnormal Alerts</CardTitle>
          <CardDescription>Flagged abnormal patterns across monitored patients</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2">
            <li>Patient 3 — Elevated heart rate trend (7% increase)</li>
            <li>Patient 7 — Irregular oxygen dips during sleep</li>
            <li>Patient 12 — Sustained high temperature readings</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comparative Trend Analysis</CardTitle>
          <CardDescription>Quick overview across patients</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Chart placeholder — integrate charts (Recharts/D3) as needed.</div>
        </CardContent>
      </Card>
    </div>
  )
}
