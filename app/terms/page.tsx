'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function TermsPage(){
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Terms & Conditions</h1>
        <p className="text-muted-foreground mt-1">Usage limitations, advisory disclaimers, and liability boundaries</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usage Limitations</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">BioTrack provides non-diagnostic advisory insights. Users should not rely solely on the platform for medical decisions—consult a qualified healthcare professional for medical advice.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Liability</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">To the extent permitted by law, the platform and its contributors are not liable for indirect or consequential damages arising from use of the service.</p>
        </CardContent>
      </Card>
    </div>
  )
}
