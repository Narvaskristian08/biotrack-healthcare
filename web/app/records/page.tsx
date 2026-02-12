"use client"

import { useState } from "react"
import { FileText, Check, X, Copy, ExternalLink, Filter, Search } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import DashboardLayout from "@/components/dashboard-layout"

export default function RecordsPage() {
  const [searchTerm, setSearchTerm] = useState("")

  const records = [
    {
      id: "REC001",
      hash: "0x7a3d4e9f2b8c1e5d3a9f2b8c1e5d3a9f",
      timestamp: "2024-01-15 14:30:45",
      dataType: "Heart Rate",
      owner: "Maria Santos",
      verified: true,
      chain: "BioChain v1",
    },
    {
      id: "REC002",
      hash: "0x8b4e5f0a3c9d2f6e4b0c2d7e5f8a1b3c",
      timestamp: "2024-01-15 14:25:12",
      dataType: "Activity Log",
      owner: "Juan Dela Cruz",
      verified: true,
      chain: "BioChain v1",
    },
    {
      id: "REC003",
      hash: "0x9c5f6g1b4d0e3g7f5c1d3e8f6g9b2c4d",
      timestamp: "2024-01-15 14:20:33",
      dataType: "Fall Detection",
      owner: "Rosa Garcia",
      verified: false,
      chain: "BioChain v1",
    },
  ]

  const filteredRecords = records.filter(
    (record) =>
      record.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.owner.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FileText className="h-8 w-8 text-primary" />
              Blockchain Records
            </h1>
            <p className="text-muted-foreground">Tamper-proof patient health records</p>
          </div>

          {/* Search */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by record ID or patient name..."
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

        {/* Records Table */}
        <Card className="glass glow-green">
          <CardHeader>
            <CardTitle>Recent Records</CardTitle>
            <CardDescription>Last 30 days of verified health records</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-white/5">
                    <TableHead className="text-foreground">Record ID</TableHead>
                    <TableHead className="text-foreground">Timestamp</TableHead>
                    <TableHead className="text-foreground">Data Type</TableHead>
                    <TableHead className="text-foreground">Patient</TableHead>
                    <TableHead className="text-foreground">Status</TableHead>
                    <TableHead className="text-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id} className="border-white/10 hover:bg-white/10">
                      <TableCell className="font-mono text-sm text-foreground">{record.id}</TableCell>
                      <TableCell className="text-foreground">{record.timestamp}</TableCell>
                      <TableCell className="text-foreground">{record.dataType}</TableCell>
                      <TableCell className="text-foreground">{record.owner}</TableCell>
                      <TableCell>
                        <Badge
                          variant={record.verified ? "default" : "secondary"}
                          className={record.verified ? "bg-primary/20 text-primary" : "bg-secondary/20 text-secondary"}
                        >
                          {record.verified ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                          {record.verified ? "Verified" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Verification Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="glass">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Total Records</p>
                <p className="text-3xl font-bold text-foreground">1,234</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Verified Records</p>
                <p className="text-3xl font-bold text-primary">1,234</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Chain Integrity</p>
                <p className="text-3xl font-bold text-accent">100%</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
