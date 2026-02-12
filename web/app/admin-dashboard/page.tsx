'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">System overview, active users and data flow status</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>Overall system health</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">All services operational</div>
            <div className="mt-4 flex gap-2">
              <Button variant="ghost">View services</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Users</CardTitle>
            <CardDescription>Current logged in users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">128</div>
            <div className="text-sm text-muted-foreground">Active sessions in the last 5 minutes</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Flow</CardTitle>
            <CardDescription>Ingestion and processing status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">Realtime pipelines healthy</div>
            <div className="mt-4">
              <Button variant="outline">Open monitoring</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
