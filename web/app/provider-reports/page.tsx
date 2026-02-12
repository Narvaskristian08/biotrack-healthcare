'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function ProviderReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Provider Reports</h1>
        <p className="text-muted-foreground mt-1">Generate medical summaries and export data for evaluation</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Patient Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Create a clinical summary for a selected patient.</p>
          <div className="mt-4 flex gap-2">
            <Button>Generate PDF</Button>
            <Button variant="outline">Export CSV</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Batch Exports</CardTitle>
          <CardDescription>Export data for a clinic or study</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Select filters then export bulk data for evaluation.</p>
          <div className="mt-4">
            <Button className="mr-2">Export Selected</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
