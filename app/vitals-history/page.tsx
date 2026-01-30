'use client'

import { useState } from 'react'
import { Heart, TrendingUp, Activity, Droplet, Wind, Thermometer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { mockPatientVitals } from '@/lib/mock-data'

interface VitalMetric {
  name: string
  data: Array<{
    timestamp: string
    value: number
    min?: number
    max?: number
  }>
  unit: string
  color: string
  icon: React.ReactNode
}

export default function VitalsHistoryPage() {
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('daily')

  // Prepare chart data
  const chartData = mockPatientVitals.map((vital) => ({
    time: vital.timestamp.split(' ')[1],
    heartRate: vital.heartRate,
    oxygenLevel: vital.oxygenLevel,
    temperature: (vital.temperature * 10).toFixed(0), // Scale for chart
    activityLevel: vital.activityLevel,
  }))

  const vitalMetrics: VitalMetric[] = [
    {
      name: 'Heart Rate',
      unit: 'bpm',
      color: '#ef4444',
      icon: <Heart className="h-5 w-5" />,
      data: mockPatientVitals.map((v) => ({
        timestamp: v.timestamp,
        value: v.heartRate,
        min: 60,
        max: 100,
      })),
    },
    {
      name: 'Oxygen Level',
      unit: '%',
      color: '#3b82f6',
      icon: <Wind className="h-5 w-5" />,
      data: mockPatientVitals.map((v) => ({
        timestamp: v.timestamp,
        value: v.oxygenLevel,
        min: 95,
        max: 100,
      })),
    },
    {
      name: 'Activity Level',
      unit: 'steps',
      color: '#10b981',
      icon: <Activity className="h-5 w-5" />,
      data: mockPatientVitals.map((v) => ({
        timestamp: v.timestamp,
        value: v.activityLevel,
      })),
    },
    {
      name: 'Temperature',
      unit: '°C',
      color: '#f59e0b',
      icon: <Thermometer className="h-5 w-5" />,
      data: mockPatientVitals.map((v) => ({
        timestamp: v.timestamp,
        value: v.temperature * 10, // Scale for display
      })),
    },
  ]

  // Calculate statistics
  const getStats = (data: VitalMetric) => {
    const values = data.data.map((d) => d.value)
    return {
      current: values[0],
      average: (values.reduce((a, b) => a + b) / values.length).toFixed(1),
      min: Math.min(...values).toFixed(1),
      max: Math.max(...values).toFixed(1),
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Vital History</h1>
        <p className="text-muted-foreground mt-1">
          Track your health metrics over time with interactive charts
        </p>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2">
        <Button
          variant={timeRange === 'daily' ? 'default' : 'outline'}
          onClick={() => setTimeRange('daily')}
        >
          Daily
        </Button>
        <Button
          variant={timeRange === 'weekly' ? 'default' : 'outline'}
          onClick={() => setTimeRange('weekly')}
        >
          Weekly
        </Button>
        <Button
          variant={timeRange === 'monthly' ? 'default' : 'outline'}
          onClick={() => setTimeRange('monthly')}
        >
          Monthly
        </Button>
      </div>

      {/* Main Chart */}
      <Card>
        <CardHeader>
          <CardTitle>All Vitals Overview</CardTitle>
          <CardDescription>Your vital signs tracked throughout the day</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="heartRate" stroke="#ef4444" name="Heart Rate (bpm)" />
                <Line type="monotone" dataKey="oxygenLevel" stroke="#3b82f6" name="Oxygen (%)" />
                <Line type="monotone" dataKey="activityLevel" stroke="#10b981" name="Activity (steps)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Individual Vital Cards */}
      <Tabs defaultValue="heart-rate" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="heart-rate">Heart Rate</TabsTrigger>
          <TabsTrigger value="oxygen">Oxygen</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="temperature">Temperature</TabsTrigger>
        </TabsList>

        {vitalMetrics.map((metric) => (
          <TabsContent key={metric.name} value={metric.name.toLowerCase().replace(' ', '-')}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: metric.color }}
                    >
                      {metric.icon}
                    </div>
                    <div>
                      <CardTitle>{metric.name}</CardTitle>
                      <CardDescription>Measured in {metric.unit}</CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold">
                      {getStats(metric).current} {metric.unit}
                    </div>
                    <p className="text-xs text-muted-foreground">Current reading</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Chart */}
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey={metric.name.toLowerCase().replace(' ', '')}
                        stroke={metric.color}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground">Current</p>
                    <p className="text-xl font-bold">{getStats(metric).current}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground">Average</p>
                    <p className="text-xl font-bold">{getStats(metric).average}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground">Minimum</p>
                    <p className="text-xl font-bold">{getStats(metric).min}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted">
                    <p className="text-xs text-muted-foreground">Maximum</p>
                    <p className="text-xl font-bold">{getStats(metric).max}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Activity and Movement Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Activity & Movement Logs</CardTitle>
          <CardDescription>Your daily movement and activity tracked</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="activityLevel" fill="#10b981" name="Activity Level" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 space-y-2">
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
              <span className="text-sm">Today's Steps</span>
              <span className="font-bold">2,340 steps</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
              <span className="text-sm">Active Time</span>
              <span className="font-bold">1 hour 23 minutes</span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
              <span className="text-sm">Distance Covered</span>
              <span className="font-bold">1.8 km</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
