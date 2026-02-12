'use client'

import { Activity, Heart, AlertTriangle, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import DashboardLayout from '@/components/dashboard-layout'
import { mockPatientVitals } from '@/lib/mock-data'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export default function HealthMonitoringPage() {
  const chartData = mockPatientVitals.map((v) => ({
    time: v.timestamp.split(' ')[1] || v.timestamp,
    heartRate: v.heartRate,
    oxygen: v.oxygenLevel,
    activity: v.activityLevel,
    temp: Number((v.temperature * 10).toFixed(0)),
  }))

  return (
    <DashboardLayout>
    <div className="space-y-8 max-w-5xl">
      {/* Page header */}
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Health Monitoring</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Your vital trends, alerts, and insights in one place
        </p>
      </header>

      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Latest heart rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{mockPatientVitals[0]?.heartRate ?? '—'} bpm</p>
            <p className="text-xs text-muted-foreground mt-1">Within normal range</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Oxygen level
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{mockPatientVitals[0]?.oxygenLevel ?? '—'}%</p>
            <p className="text-xs text-muted-foreground mt-1">SpO₂</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{mockPatientVitals[0]?.activityLevel ?? '—'}</p>
            <p className="text-xs text-muted-foreground mt-1">Latest reading</p>
          </CardContent>
        </Card>
      </div>

      {/* Your alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Your alerts
          </CardTitle>
          <CardDescription>
            Flagged patterns from your monitored vitals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
              <span className="text-amber-500 mt-0.5">•</span>
              <span className="text-sm">Elevated heart rate trend (7% increase over last week)</span>
            </li>
            <li className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
              <span className="text-amber-500 mt-0.5">•</span>
              <span className="text-sm">Activity below daily average — consider light exercise</span>
            </li>
            <li className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
              <span className="text-green-500 mt-0.5">•</span>
              <span className="text-sm">Oxygen levels stable and within normal range</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Trend chart */}
      <Card>
        <CardHeader>
          <CardTitle>Your vital trends</CardTitle>
          <CardDescription>
            Overview of your vital signs over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="time" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{ borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="heartRate"
                  name="Heart rate (bpm)"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="oxygen"
                  name="Oxygen (%)"
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="activity"
                  name="Activity"
                  stroke="var(--chart-3)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
    </DashboardLayout>
  )
}
