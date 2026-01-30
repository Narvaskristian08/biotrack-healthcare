'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const backups = [
  { id: 'b1', date: '2026-01-30 02:00', type: 'Full', status: 'Completed' },
  { id: 'b2', date: '2026-01-15 02:00', type: 'Incremental', status: 'Completed' },
]

export default function BackupRecoveryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Data Backup & Recovery</h1>
        <p className="text-muted-foreground mt-1">Backup history, restore points and data integrity checks</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Backup History</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside text-sm text-muted-foreground">
            {backups.map((b) => (
              <li key={b.id}>{b.date} • {b.type} • {b.status}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Restore Points</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button>Restore Most Recent</Button>
            <Button variant="outline">View Restore Points</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
