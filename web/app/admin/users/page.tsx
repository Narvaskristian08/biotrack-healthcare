'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const demoUsers = [
  { id: 'u1', name: 'Alice Admin', email: 'alice@biotrack.com', role: 'admin', active: true },
  { id: 'u2', name: 'Dr. Lee', email: 'lee@clinic.com', role: 'provider', active: true },
  { id: 'u3', name: 'Bob Patient', email: 'bob@example.com', role: 'patient', active: false },
]

export default function AdminUsersPage() {
  const [query, setQuery] = useState('')

  const filtered = demoUsers.filter((u) => u.name.toLowerCase().includes(query.toLowerCase()) || u.email.toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">User Management</h1>
        <p className="text-muted-foreground mt-1">Create, update, deactivate users and assign roles</p>
      </div>

      <div className="flex items-center gap-4">
        <Input placeholder="Search users by name or email..." value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-md" />
        <Link href="/admin/users/create">
          <Button>Create User</Button>
        </Link>
      </div>

      <div className="grid gap-3">
        {filtered.map((u) => (
          <Card key={u.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{u.name}</CardTitle>
                  <CardDescription>{u.email}</CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-sm">Role: {u.role}</div>
                  <div className={`text-xs ${u.active ? 'text-green-600' : 'text-muted-foreground'}`}>{u.active ? 'Active' : 'Inactive'}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Link href={`/admin/users/${u.id}`}>
                  <Button variant="outline">Edit</Button>
                </Link>
                <Button variant="ghost">Deactivate</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
