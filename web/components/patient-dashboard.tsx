'use client'

import React, { useState } from 'react'
import { Heart, Activity, Droplets, Thermometer, TrendingUp, Download, Calendar } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  mockPatientVitals, mockHealthInsights, mockMedicalRecords,
  mockHeartRateTrend, mockActivityTrend, mockMovementTrend
} from '@/lib/mock-data'
import StatsCard from './stats-card'

export default function PatientDashboard() {
  const [timePeriod, setTimePeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const currentVital = mockPatientVitals[0]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground">My Health Dashboard</h1>
            <p className="text-muted-foreground text-lg mt-1">
              Track your vital signs and health metrics
            </p>
          </div>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Download Summary
          </Button>
        </div>
      </div>

      {/* Current Vitals */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Heart Rate"
          value={`${currentVital.heartRate} bpm`}
          change="Normal"
          icon={<Heart className="h-5 w-5" />}
          trend="stable"
        />
        <StatsCard
          title="Blood Pressure"
          value={currentVital.bloodPressure}
          change="Healthy"
          icon={<Droplets className="h-5 w-5" />}
          trend="stable"
        />
        <StatsCard
          title="Oxygen Level"
          value={`${currentVital.oxygenLevel}%`}
          change="Excellent"
          icon={<Activity className="h-5 w-5" />}
          trend="up"
        />
        <StatsCard
          title="Temperature"
          value={`${currentVital.temperature}°C`}
          change="Normal"
          icon={<Thermometer className="h-5 w-5" />}
          trend="stable"
        />
      </div>

      {/* Main Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Heart Rate Trends */}
        <Card className="lg:col-span-2 glass glow-green">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary" />
                  Heart Rate Trends
                </CardTitle>
                <CardDescription>Weekly average with min/max range</CardDescription>
              </div>
              <Tabs value={timePeriod} onValueChange={(v) => setTimePeriod(v as 'daily' | 'weekly' | 'monthly')}>
                <TabsList className="h-8">
                  <TabsTrigger value="daily" className="text-xs">Daily</TabsTrigger>
                  <TabsTrigger value="weekly" className="text-xs">Weekly</TabsTrigger>
                  <TabsTrigger value="monthly" className="text-xs">Monthly</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
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
                <Line type="monotone" dataKey="average" stroke="var(--primary)" strokeWidth={2} />
                <Line type="monotone" dataKey="min" stroke="var(--muted-foreground)" strokeWidth={1} strokeDasharray="5 5" />
                <Line type="monotone" dataKey="max" stroke="var(--secondary)" strokeWidth={1} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* AI Health Insights */}
        <Card className="glass glow-cyan">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              AI Insights
            </CardTitle>
            <CardDescription>Personalized health recommendations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockHealthInsights.map((insight, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border ${
                  insight.type === 'warning'
                    ? 'bg-destructive/10 border-destructive/30'
                    : insight.type === 'success'
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-blue-500/10 border-blue-500/30'
                }`}
              >
                <div className="flex items-start gap-2">
                  <Badge
                    variant={insight.type === 'warning' ? 'destructive' : insight.type === 'success' ? 'default' : 'secondary'}
                    className="mt-0.5"
                  >
                    {insight.type}
                  </Badge>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{insight.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Activity and Movement */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass glow-green">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-accent" />
              Activity Summary
            </CardTitle>
            <CardDescription>Steps and calories burned</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={mockActivityTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" />
                <YAxis yAxisId="left" stroke="var(--muted-foreground)" />
                <YAxis yAxisId="right" orientation="right" stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="steps" fill="var(--chart-1)" radius={[8, 8, 0, 0]} />
                <Bar yAxisId="right" dataKey="calories" fill="var(--chart-2)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass glow-cyan">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-secondary" />
              Movement Breakdown
            </CardTitle>
            <CardDescription>Time spent in different activities</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={mockMovementTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--muted-foreground)" />
                <YAxis stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  }}
                />
                <Legend />
                <Area type="monotone" dataKey="walking" stackId="1" fill="var(--chart-3)" />
                <Area type="monotone" dataKey="running" stackId="1" fill="var(--chart-1)" />
                <Area type="monotone" dataKey="resting" stackId="1" fill="var(--chart-4)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Medical Records */}
      <Card className="glass glow-green">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Medical Records</CardTitle>
              <CardDescription>Verified blockchain records (read-only)</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockMedicalRecords.map((record) => (
              <div
                key={record.id}
                className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-sm">{record.type}</h3>
                      <Badge variant="outline" className="text-xs gap-1">
                        ✓ Verified
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{record.notes}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {record.date}
                      </span>
                      <span>By: {record.doctor}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
