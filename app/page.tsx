"use client"
import { Heart, AlertCircle, Users, Lock, Activity, Zap } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts"
import DashboardLayout from "@/components/dashboard-layout"
import StatsCard from "@/components/stats-card"
import AlertsPanel from "@/components/alerts-panel"
import VitalsChart from "@/components/vitals-chart"
import UsersList from "@/components/users-list"

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-lg">
            Monitor your patients' vital signs in real-time with AI insights
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard title="Active Users" value="248" change="+12%" icon={<Users className="h-5 w-5" />} trend="up" />
          <StatsCard
            title="Average BPM"
            value="72"
            change="+2 bpm"
            icon={<Heart className="h-5 w-5" />}
            trend="stable"
          />
          <StatsCard
            title="Fall Incidents"
            value="3"
            change="2 today"
            icon={<AlertCircle className="h-5 w-5" />}
            trend="down"
          />
          <StatsCard
            title="Blockchain Status"
            value="100%"
            change="Verified"
            icon={<Lock className="h-5 w-5" />}
            trend="stable"
          />
        </div>

        {/* Main Content Grid */}
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
                  <CardDescription>Last 7 days average vitals</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <VitalsChart />
            </CardContent>
          </Card>

          {/* Alerts */}
          <AlertsPanel />
        </div>

        {/* Analytics Row */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="glass glow-green">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-accent" />
                Activity Heatmap
              </CardTitle>
              <CardDescription>Weekly activity distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" stroke="var(--muted-foreground)" />
                  <YAxis stroke="var(--muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                  />
                  <Bar dataKey="activity" fill="var(--chart-1)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="glass glow-cyan">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-secondary" />
                Fall Detection
              </CardTitle>
              <CardDescription>Incidents detected this week</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={fallData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" stroke="var(--muted-foreground)" />
                  <YAxis stroke="var(--muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                  />
                  <Area type="monotone" dataKey="incidents" fill="var(--chart-4)" stroke="var(--secondary)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent Users */}
        <Card className="glass glow-green">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Monitored Users
            </CardTitle>
            <CardDescription>Recently active patients with vital status</CardDescription>
          </CardHeader>
          <CardContent>
            <UsersList />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

const activityData = [
  { day: "Mon", activity: 65 },
  { day: "Tue", activity: 75 },
  { day: "Wed", activity: 82 },
  { day: "Thu", activity: 71 },
  { day: "Fri", activity: 88 },
  { day: "Sat", activity: 62 },
  { day: "Sun", activity: 79 },
]

const fallData = [
  { day: "Mon", incidents: 1 },
  { day: "Tue", incidents: 0 },
  { day: "Wed", incidents: 2 },
  { day: "Thu", incidents: 0 },
  { day: "Fri", incidents: 1 },
  { day: "Sat", incidents: 0 },
  { day: "Sun", incidents: 0 },
]
