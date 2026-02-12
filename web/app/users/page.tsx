"use client"

import { useState } from "react"
import { Users, Search, Filter, Heart } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import DashboardLayout from "@/components/dashboard-layout"
import Link from "next/link"

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState("")

  const users = [
    {
      id: 1,
      name: "Maria Santos",
      email: "maria.santos@email.com",
      bpm: 72,
      status: "normal",
      lastUpdate: "2 mins ago",
      age: 65,
    },
    {
      id: 2,
      name: "Juan Dela Cruz",
      email: "juan.dc@email.com",
      bpm: 88,
      status: "elevated",
      lastUpdate: "5 mins ago",
      age: 58,
    },
    {
      id: 3,
      name: "Rosa Garcia",
      email: "rosa.garcia@email.com",
      bpm: 95,
      status: "critical",
      lastUpdate: "1 min ago",
      age: 72,
    },
  ]

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Users className="h-8 w-8 text-primary" />
              User Management
            </h1>
            <p className="text-muted-foreground">Monitor and manage patient profiles</p>
          </div>

          {/* Search and Filter */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 glass-sm border-white/10 bg-white/10"
              />
            </div>
            <Button variant="outline" className="glass-sm border-white/10 bg-transparent">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Users Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user) => (
            <Link key={user.id} href={`/users/${user.id}`}>
              <Card className="glass glow-green hover:glow-cyan transition-all cursor-pointer h-full hover:scale-105 duration-300">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <Badge
                        variant={
                          user.status === "normal"
                            ? "default"
                            : user.status === "elevated"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {user.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                      <div className="flex items-center gap-2">
                        <Heart className="h-4 w-4 text-primary" />
                        <div className="text-sm">
                          <p className="text-xs text-muted-foreground">BPM</p>
                          <p className="font-semibold text-foreground">{user.bpm}</p>
                        </div>
                      </div>
                      <div className="text-sm text-right">
                        <p className="text-xs text-muted-foreground">Age</p>
                        <p className="font-semibold text-foreground">{user.age}y</p>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">Updated {user.lastUpdate}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  )
}
