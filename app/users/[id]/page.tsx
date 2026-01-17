"use client"
import { ArrowLeft, Heart, Activity, Brain, Lock, Download } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import DashboardLayout from "@/components/dashboard-layout"
import Link from "next/link"

export default function UserDetailPage({ params }: { params: { id: string } }) {
  const user = {
    id: params.id,
    name: "Maria Santos",
    email: "maria.santos@email.com",
    phone: "+63 917 123 4567",
    age: 65,
    bloodType: "O+",
    medicalHistory: "Hypertension, Type 2 Diabetes",
    lastCheckup: "2024-01-10",
    status: "normal",
  }

  const vitalHistory = [
    { time: "12:00", bpm: 72, oxygen: 98, temp: 36.5 },
    { time: "13:00", bpm: 74, oxygen: 97, temp: 36.6 },
    { time: "14:00", bpm: 70, oxygen: 99, temp: 36.4 },
    { time: "15:00", bpm: 75, oxygen: 98, temp: 36.5 },
    { time: "16:00", bpm: 73, oxygen: 98, temp: 36.5 },
  ]

  const aiAdvice =
    "Patient's vitals are stable. Continue current medications. Recommend light exercise and balanced diet. Next checkup scheduled in 2 weeks."

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Back Button */}
        <Link href="/users" className="inline-flex items-center gap-2 text-primary hover:text-accent transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Users
        </Link>

        {/* Header */}
        <div className="glass-lg p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground">{user.name}</h1>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
            <Badge className="bg-primary/20 text-primary">{user.status}</Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/10">
            <div>
              <p className="text-sm text-muted-foreground">Age</p>
              <p className="text-lg font-semibold text-foreground">{user.age}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Blood Type</p>
              <p className="text-lg font-semibold text-foreground">{user.bloodType}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="text-lg font-semibold text-foreground truncate">{user.phone}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Checkup</p>
              <p className="text-lg font-semibold text-foreground">{user.lastCheckup}</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Vitals History */}
          <Card className="lg:col-span-2 glass glow-green">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Vital Signs History
              </CardTitle>
              <CardDescription>Today's measurements</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={vitalHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="time" stroke="var(--muted-foreground)" />
                  <YAxis stroke="var(--muted-foreground)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(15, 23, 42, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="bpm"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    dot={{ fill: "var(--chart-1)", r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="space-y-4">
            <Card className="glass glow-cyan">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Heart className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Current BPM</p>
                      <p className="text-2xl font-bold text-foreground">72</p>
                    </div>
                  </div>
                  <div className="h-px bg-white/10"></div>
                  <div className="flex items-center gap-3">
                    <Activity className="h-8 w-8 text-secondary" />
                    <div>
                      <p className="text-sm text-muted-foreground">O2 Level</p>
                      <p className="text-2xl font-bold text-foreground">98%</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* AI Advisory */}
        <Card className="glass glow-green">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-accent" />
              AI Health Advisory
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground leading-relaxed">{aiAdvice}</p>
          </CardContent>
        </Card>

        {/* Medical History */}
        <Card className="glass glow-cyan">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-secondary" />
              Medical Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground">
              <strong>Medical History:</strong> {user.medicalHistory}
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
