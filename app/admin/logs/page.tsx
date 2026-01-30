'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const demoLogs = [
  { id: 'l1', type: 'login', user: 'alice@biotrack.com', timestamp: '2026-01-30 09:02', detail: 'Successful login' },
  { id: 'l2', type: 'access', user: 'lee@clinic.com', timestamp: '2026-01-30 08:45', detail: 'Viewed patient p-3 records' },
  { id: 'l3', type: 'security', user: 'system', timestamp: '2026-01-29 22:10', detail: 'Failed login attempt' },
]

export default function AdminLogsPage() {
  const [query, setQuery] = useState('')

  const filtered = demoLogs.filter((l) => l.user.toLowerCase().includes(query.toLowerCase()) || l.detail.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">System Logs & Activity</h1>
        <p className="text-muted-foreground mt-1">Login history, data access logs, and security events</p>
      </div>

      <div className="flex items-center gap-4">
        <Input placeholder="Search logs..." value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-md" />
        <Button variant="outline">Export</Button>
      </div>

      <div className="grid gap-2">
        {filtered.map((l) => (
          <Card key={l.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm">{l.type.toUpperCase()}</CardTitle>
                  <CardDescription className="text-xs">{l.timestamp} • {l.user}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">{l.detail}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
