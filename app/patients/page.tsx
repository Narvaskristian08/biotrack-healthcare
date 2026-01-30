'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useState, useMemo } from 'react'
import { mockPatientVitals, mockHealthInsights } from '@/lib/mock-data'

export default function PatientsPage() {
  const [query, setQuery] = useState('')

  // Build a simple patient list from vitals mock (demo)
  const patients = useMemo(() => {
    return mockPatientVitals.map((v, i) => ({
      id: `p-${i + 1}`,
      name: `Patient ${i + 1}`,
      lastSeen: v.timestamp,
      heartRate: v.heartRate,
    }))
  }, [])

  const filtered = patients.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Patient List</h1>
        <p className="text-muted-foreground mt-1">Search and access patient profiles (permission-based)</p>
      </div>

      <div className="flex items-center gap-4">
        <Input placeholder="Search patients..." value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-md" />
        <Button variant="outline">Filter</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((p) => (
          <Card key={p.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{p.name}</CardTitle>
                  <CardDescription>Last seen: {p.lastSeen}</CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">{p.heartRate} bpm</div>
                  <div className="text-xs text-muted-foreground">Heart rate</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Link href={`/patients/${p.id}`} className="text-sm text-primary hover:underline">
                View profile
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
