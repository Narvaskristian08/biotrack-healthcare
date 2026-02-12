'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function AboutPage(){
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">About BioTrack</h1>
        <p className="text-muted-foreground mt-1">Project overview, objectives and alignment with SDG 3</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">BioTrack is a healthcare monitoring platform designed to provide continuous vital tracking, AI-driven insights, and secure record verification using blockchain technologies. The project aims to improve early detection and continuity of care.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Objectives</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside text-sm text-muted-foreground">
            <li>Provide accessible patient monitoring tools</li>
            <li>Enable provider workflows for timely interventions</li>
            <li>Ensure data integrity and transparency</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SDG Alignment</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aligned to Sustainable Development Goal 3: Good Health and Well-being — by improving access to timely health data and supporting preventive care.</p>
        </CardContent>
      </Card>
    </div>
  )
}
