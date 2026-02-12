'use client'

import { useState } from 'react'
import { Heart, Activity, Wind, Thermometer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import DashboardLayout from '@/components/dashboard-layout'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { mockPatientVitals } from '@/lib/mock-data'

const chartData = mockPatientVitals.map((v) => ({
  time: v.timestamp.split(' ')[1] || v.timestamp,
  heartRate: v.heartRate,
  oxygenLevel: v.oxygenLevel,
  temperature: Number((v.temperature * 10).toFixed(0)),
  activityLevel: v.activityLevel,
}))

const VITAL_KEYS = {
  'heart-rate': { dataKey: 'heartRate', label: 'Heart Rate', unit: 'bpm', color: 'var(--chart-1)' },
  oxygen: { dataKey: 'oxygenLevel', label: 'Oxygen', unit: '%', color: 'var(--chart-2)' },
  activity: { dataKey: 'activityLevel', label: 'Activity', unit: '', color: 'var(--chart-3)' },
  temperature: { dataKey: 'temperature', label: 'Temperature', unit: '×10 °C', color: 'var(--chart-4)' },
} as const

type VitalTab = keyof typeof VITAL_KEYS

function getStats(dataKey: string) {
  const values = chartData.map((d) => (d as Record<string, number>)[dataKey]).filter((v) => typeof v === 'number')
  if (values.length === 0) return { current: '—', average: '—', min: '—', max: '—' }
  const current = values[0]
  const sum = values.reduce((a, b) => a + b, 0)
  const average = (sum / values.length).toFixed(1)
  const min = Math.min(...values).toFixed(1)
  const max = Math.max(...values).toFixed(1)
  return { current: String(current), average, min, max }
}

export default function VitalsHistoryPage() {
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('daily')

  return (
    <DashboardLayout>
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Vitals History</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Track your health metrics over time with interactive charts
        </p>
      </header>

      {/* Time range */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={timeRange === 'daily' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimeRange('daily')}
        >
          Daily
        </Button>
        <Button
          variant={timeRange === 'weekly' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimeRange('weekly')}
        >
          Weekly
        </Button>
        <Button
          variant={timeRange === 'monthly' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimeRange('monthly')}
        >
          Monthly
        </Button>
      </div>

      {/* Overview chart */}
      <Card>
        <CardHeader>
          <CardTitle>All vitals overview</CardTitle>
          <CardDescription>Your vital signs over time</CardDescription>
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
                <Line type="monotone" dataKey="heartRate" name="Heart rate (bpm)" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="oxygenLevel" name="Oxygen (%)" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="activityLevel" name="Activity" stroke="var(--chart-3)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Per-vital tabs */}
      <Tabs defaultValue="heart-rate" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto p-1">
          <TabsTrigger value="heart-rate" className="rounded-md text-xs sm:text-sm">Heart Rate</TabsTrigger>
          <TabsTrigger value="oxygen" className="rounded-md text-xs sm:text-sm">Oxygen</TabsTrigger>
          <TabsTrigger value="activity" className="rounded-md text-xs sm:text-sm">Activity</TabsTrigger>
          <TabsTrigger value="temperature" className="rounded-md text-xs sm:text-sm">Temperature</TabsTrigger>
        </TabsList>

        {(Object.keys(VITAL_KEYS) as VitalTab[]).map((tabKey) => {
          const config = VITAL_KEYS[tabKey]
          const stats = getStats(config.dataKey)
          const icon =
            tabKey === 'heart-rate' ? Heart : tabKey === 'oxygen' ? Wind : tabKey === 'activity' ? Activity : Thermometer
          const Icon = icon

          return (
            <TabsContent key={tabKey} value={tabKey} className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-primary-foreground"
                        style={{ backgroundColor: config.color }}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle>{config.label}</CardTitle>
                        <CardDescription>Measured in {config.unit || 'units'}</CardDescription>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-2xl font-bold">
                        {stats.current} {config.unit}
                      </p>
                      <p className="text-xs text-muted-foreground">Current reading</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="time" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip
                          contentStyle={{ borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}
                        />
                        <Line
                          type="monotone"
                          dataKey={config.dataKey}
                          name={config.label}
                          stroke={config.color}
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-muted/50 border border-border">
                      <p className="text-xs text-muted-foreground">Current</p>
                      <p className="text-lg font-bold">{stats.current}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 border border-border">
                      <p className="text-xs text-muted-foreground">Average</p>
                      <p className="text-lg font-bold">{stats.average}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 border border-border">
                      <p className="text-xs text-muted-foreground">Min</p>
                      <p className="text-lg font-bold">{stats.min}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50 border border-border">
                      <p className="text-xs text-muted-foreground">Max</p>
                      <p className="text-lg font-bold">{stats.max}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )
        })}
      </Tabs>

      {/* Activity log */}
      <Card>
        <CardHeader>
          <CardTitle>Activity & movement</CardTitle>
          <CardDescription>Your daily movement and activity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="time" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{ borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}
                />
                <Bar dataKey="activityLevel" fill="var(--chart-3)" name="Activity" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50 border border-border">
              <span className="text-sm">Today&apos;s steps</span>
              <span className="font-bold">2,340</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50 border border-border">
              <span className="text-sm">Active time</span>
              <span className="font-bold">1h 23m</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50 border border-border">
              <span className="text-sm">Distance</span>
              <span className="font-bold">1.8 km</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </DashboardLayout>
  )
}
