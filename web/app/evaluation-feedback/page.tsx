'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function EvaluationFeedbackPage(){
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Evaluation & Feedback</h1>
        <p className="text-muted-foreground mt-1">User feedback summaries, survey results and effectiveness indicators</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Feedback</CardTitle>
            <CardDescription>Collected from in-app surveys</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside text-sm text-muted-foreground">
              <li>Users find the vitals dashboard intuitive</li>
              <li>Requests for export formats (PDF/CSV) increased</li>
              <li>Some reports mention mobile layout issues</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Survey Results Snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">Overall satisfaction: 88%</div>
            <div className="mt-4">
              <Input placeholder="Filter surveys by tag..." />
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Effectiveness Indicators</CardTitle>
            <CardDescription>High-level KPIs for evaluation</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside text-sm text-muted-foreground">
              <li>Alert resolution rate: 76%</li>
              <li>Report downloads per month: 1.2k</li>
              <li>AI advisory follow-through: 22%</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
