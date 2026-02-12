'use client'

import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { mockPatientVitals } from '@/lib/mock-data'

export default function PatientDetailPage() {
  const params = useSearchParams()
  const id = params.get('id') || 'p-1'
  const index = parseInt(id.replace('p-', '')) - 1
  const vital = mockPatientVitals[index] || mockPatientVitals[0]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Patient Detail</h1>
        <p className="text-muted-foreground mt-1">Selected patient’s vital history and AI insights</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Latest Vitals</CardTitle>
          <CardDescription>Snapshot of most recent reading</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground">Heart Rate</p>
              <p className="text-xl font-bold">{vital.heartRate} bpm</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground">Oxygen</p>
              <p className="text-xl font-bold">{vital.oxygenLevel}%</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground">Temperature</p>
              <p className="text-xl font-bold">{vital.temperature} °C</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground">Activity</p>
              <p className="text-xl font-bold">{vital.activityLevel}</p>
            </div>
          </div>
          <div className="mt-4">
            <Button variant="outline">Open full record</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
