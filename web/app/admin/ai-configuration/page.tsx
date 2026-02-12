'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const demoPrompts = [
  { id: 'p1', name: 'Cardiac Risk Template', content: 'Analyze heart rate trends and summarize risk.' },
  { id: 'p2', name: 'Hydration Reminder', content: 'Detect dehydration indicators and suggest actions.' },
]

export default function AIConfigPage() {
  const [prompts, setPrompts] = useState(demoPrompts)
  const [query, setQuery] = useState('')

  const filtered = prompts.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Configuration</h1>
        <p className="text-muted-foreground mt-1">Manage AI prompt templates and advisory logic (admin-only)</p>
      </div>

      <div className="flex items-center gap-4">
        <Input placeholder="Search templates..." value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-md" />
        <Button>Create Template</Button>
      </div>

      <div className="grid gap-3">
        {filtered.map((t) => (
          <Card key={t.id}>
            <CardHeader>
              <CardTitle>{t.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">{t.content}</div>
              <div className="mt-3 flex gap-2">
                <Button variant="outline">Edit</Button>
                <Button variant="ghost">Delete</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
