"use client"
import { BarChart3, LineChartIcon, PieChartIcon, Calendar } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import DashboardLayout from "@/components/dashboard-layout"

export default function AnalyticsPage() {
  const bpmData = [
    { time: "00:00", avg: 72, min: 68, max: 78 },
    { time: "04:00", avg: 70, min: 66, max: 76 },
    { time: "08:00", avg: 75, min: 70, max: 82 },
    { time: "12:00", avg: 78, min: 72, max: 85 },
    { time: "16:00", avg: 76, min: 71, max: 83 },
    { time: "20:00", avg: 73, min: 68, max: 80 },
  ]

  const distributionData = [
    { range: "60-70", value: 25 },
    { range: "70-80", value: 45 },
    { range: "80-90", value: 20 },
    { range: "90-100", value: 10 },
  ]

  const ageGroupData = [
    { age: "40-50", count: 35 },
    { age: "50-60", count: 48 },
    { age: "60-70", count: 62 },
    { age: "70-80", count: 45 },
  ]

  const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-primary" />
              Analytics & Reports
            </h1>
            <p className="text-muted-foreground">Comprehensive health data analysis</p>
          </div>

          {/* Date Range Selector */}
          <div className="flex gap-2">
            <Button variant="outline" className="glass-sm border-white/10 bg-transparent">
              <Calendar className="h-4 w-4 mr-2" />
              Last 7 Days
            </Button>
            <Button variant="outline" className="glass-sm border-white/10 bg-transparent">
              Last 30 Days
            </Button>
            <Button variant="outline" className="glass-sm border-white/10 bg-transparent">
              Last 90 Days
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="glass">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Avg BPM</p>
                <p className="text-3xl font-bold text-foreground">74.2</p>
                <p className="text-xs text-primary">Normal range</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Patients Monitored</p>
                <p className="text-3xl font-bold text-foreground">248</p>
                <p className="text-xs text-primary">+12 this week</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Alerts Generated</p>
                <p className="text-3xl font-bold text-foreground">23</p>
                <p className="text-xs text-secondary">This week</p>
              </div>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Data Integrity</p>
                <p className="text-3xl font-bold text-foreground">100%</p>
                <p className="text-xs text-accent">Verified</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* BPM Trends */}
          <Card className="glass glow-green">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChartIcon className="h-5 w-5 text-primary" />
                BPM Trends
              </CardTitle>
              <CardDescription>24-hour vital trends</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={bpmData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="time" stroke="var(--muted-foreground)" />
                  <YAxis stroke="var(--muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="avg" stroke="var(--chart-1)" strokeWidth={2} />
                  <Line type="monotone" dataKey="min" stroke="var(--chart-3)" strokeWidth={1} strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="max" stroke="var(--chart-4)" strokeWidth={1} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* BPM Distribution */}
          <Card className="glass glow-cyan">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-secondary" />
                BPM Distribution
              </CardTitle>
              <CardDescription>Patient distribution by heart rate</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ range, value }) => `${range}: ${value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Age Group Analysis */}
          <Card className="lg:col-span-2 glass glow-green">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-accent" />
                Patient Demographics
              </CardTitle>
              <CardDescription>Distribution by age group</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ageGroupData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="age" stroke="var(--muted-foreground)" />
                  <YAxis stroke="var(--muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                  />
                  <Bar dataKey="count" fill="var(--chart-1)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Export Section */}
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground">Export Analytics Report</h3>
                <p className="text-sm text-muted-foreground">
                  Download comprehensive health analytics in PDF or CSV format
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="glass-sm border-white/10 bg-transparent">
                  PDF
                </Button>
                <Button variant="outline" className="glass-sm border-white/10 bg-transparent">
                  CSV
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
