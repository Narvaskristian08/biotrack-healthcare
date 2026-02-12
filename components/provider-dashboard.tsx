'use client'

import React, { useState } from 'react'
import {
  Users, AlertTriangle, Heart, TrendingDown, Search, Filter,
  FileText, CheckCircle, AlertCircle, Clock
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import { mockPatientsList, mockHeartRateTrend } from '@/lib/mock-data'
import StatsCard from './stats-card'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

export default function ProviderDashboard() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'alerts' | 'verified'>('all')

  const filteredPatients = mockPatientsList.filter((patient) => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase())
    if (selectedFilter === 'alerts') return matchesSearch && patient.alerts.length > 0
    if (selectedFilter === 'verified') return matchesSearch && patient.blockchainVerified
    return matchesSearch
  })

  const alertCount = mockPatientsList.reduce((sum, p) => sum + p.alerts.length, 0)
  const criticalPatients = mockPatientsList.filter(p => p.alerts.length > 0).length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">Provider Dashboard</h1>
        <p className="text-muted-foreground text-lg">
          Monitor and manage authorized patient records with real-time alerts
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Patients"
          value={mockPatientsList.length.toString()}
          change="Active monitoring"
          icon={<Users className="h-5 w-5" />}
          trend="up"
        />
        <StatsCard
          title="Active Alerts"
          value={alertCount.toString()}
          change={`${criticalPatients} patients`}
          icon={<AlertTriangle className="h-5 w-5" />}
          trend="down"
        />
        <StatsCard
          title="Verified Records"
          value={mockPatientsList.filter(p => p.blockchainVerified).length.toString()}
          change="100% verified"
          icon={<CheckCircle className="h-5 w-5" />}
          trend="stable"
        />
        <StatsCard
          title="Fall Incidents"
          value="2"
          change="This week"
          icon={<TrendingDown className="h-5 w-5" />}
          trend="down"
        />
      </div>

      {/* Patient Monitoring */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Heart Rate Trends Across Patients */}
        <Card className="lg:col-span-2 glass glow-green">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              Patient Heart Rate Analytics
            </CardTitle>
            <CardDescription>Average trends across monitored patients</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockHeartRateTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="average" stroke="var(--primary)" strokeWidth={2} name="Average BPM" />
                <Line type="monotone" dataKey="min" stroke="var(--muted-foreground)" strokeWidth={1} name="Minimum" />
                <Line type="monotone" dataKey="max" stroke="var(--secondary)" strokeWidth={1} name="Maximum" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Critical Alerts */}
        <Card className="glass glow-cyan">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Critical Alerts
            </CardTitle>
            <CardDescription>Requires immediate attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockPatientsList
              .filter(p => p.alerts.length > 0)
              .map((patient) => (
                <div key={patient.id} className="p-3 border border-destructive/30 bg-destructive/5 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm">{patient.name}</p>
                      <p className="text-xs text-muted-foreground">{patient.condition}</p>
                    </div>
                    <Badge variant="destructive" className="text-xs">{patient.alerts.length}</Badge>
                  </div>
                  <div className="space-y-1">
                    {patient.alerts.map((alert, idx) => (
                      <p key={idx} className="text-xs text-destructive flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {alert}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>

      {/* Patient Records Table */}
      <Card className="glass glow-green">
        <CardHeader>
          <div className="space-y-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Patient Monitoring
              </CardTitle>
              <CardDescription>Comprehensive patient list with vital status and alerts</CardDescription>
            </div>

            {/* Search and Filter */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search patient name, ID, or condition..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="icon" className="gap-2">
                <Filter className="h-4 w-4" />
              </Button>
            </div>

            {/* Filter Tabs */}
            <Tabs value={selectedFilter} onValueChange={(v) => setSelectedFilter(v as 'all' | 'alerts' | 'verified')}>
              <TabsList>
                <TabsTrigger value="all">All Patients</TabsTrigger>
                <TabsTrigger value="alerts" className="flex items-center gap-2">
                  Alerts <Badge variant="destructive" className="ml-1 text-xs">{alertCount}</Badge>
                </TabsTrigger>
                <TabsTrigger value="verified">Verified Records</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>Patient Name</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Heart Rate</TableHead>
                  <TableHead>Blood Pressure</TableHead>
                  <TableHead>O₂ Level</TableHead>
                  <TableHead>Alerts</TableHead>
                  <TableHead>Blockchain Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.map((patient) => (
                  <TableRow key={patient.id} className="border-border hover:bg-muted/50">
                    <TableCell className="font-medium">{patient.name}</TableCell>
                    <TableCell>{patient.age}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{patient.condition}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className={patient.lastVital.heartRate > 85 ? 'text-destructive font-semibold' : ''}>
                        {patient.lastVital.heartRate} bpm
                      </span>
                    </TableCell>
                    <TableCell>{patient.lastVital.bloodPressure}</TableCell>
                    <TableCell>{patient.lastVital.oxygenLevel}%</TableCell>
                    <TableCell>
                      {patient.alerts.length > 0 ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {patient.alerts.length}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Clear
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {patient.blockchainVerified ? (
                        <Badge variant="outline" className="gap-1 bg-green-500/10 text-green-700">
                          <CheckCircle className="h-3 w-3" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <Clock className="h-3 w-3" />
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="gap-1">
                        <FileText className="h-4 w-4" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Generate Reports */}
      <Card className="glass glow-cyan">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-accent" />
            Generate Reports
          </CardTitle>
          <CardDescription>Create evaluation and research reports</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Button className="justify-start h-auto flex-col items-start p-4 rounded-lg border border-border hover:border-primary">
            <span className="font-semibold">Weekly Vital Report</span>
            <span className="text-xs text-muted-foreground mt-1">Summary of all monitored vitals</span>
          </Button>
          <Button className="justify-start h-auto flex-col items-start p-4 rounded-lg border border-border hover:border-primary">
            <span className="font-semibold">Alert Analysis</span>
            <span className="text-xs text-muted-foreground mt-1">Trends and patterns in patient alerts</span>
          </Button>
          <Button className="justify-start h-auto flex-col items-start p-4 rounded-lg border border-border hover:border-primary">
            <span className="font-semibold">Compliance Report</span>
            <span className="text-xs text-muted-foreground mt-1">Blockchain verification status</span>
          </Button>
          <Button className="justify-start h-auto flex-col items-start p-4 rounded-lg border border-border hover:border-primary">
            <span className="font-semibold">Patient Population Report</span>
            <span className="text-xs text-muted-foreground mt-1">Demographics and condition analysis</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
