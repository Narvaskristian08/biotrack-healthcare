'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function PrivacyPage(){
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Privacy Policy</h1>
        <p className="text-muted-foreground mt-1">Explanation of data handling, encryption and security assurances</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Data Handling</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">We collect minimal personal data required for service delivery. Patient vitals, records, and profile information are stored securely and accessed only by authorized users.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Encryption & Security</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">All sensitive data is encrypted at rest and in transit. Access controls, audit logs, and blockchain verification are used to ensure integrity and accountability.</p>
        </CardContent>
      </Card>
    </div>
  )
}
