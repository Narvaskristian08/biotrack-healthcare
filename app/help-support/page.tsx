'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function HelpSupportPage(){
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Help & Support</h1>
        <p className="text-muted-foreground mt-1">FAQs, contact information, and usage guides</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside text-sm text-muted-foreground">
            <li>How do I export my health summary? — Use Reports & Downloads → Export.</li>
            <li>How is my data stored? — See Privacy Policy for details on encryption and retention.</li>
            <li>Who can view my records? — Providers with permissions and verified access.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contact</CardTitle>
          <CardDescription>Support channels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Email: support@biotrack.example</p>
            <p>Phone: +1 (555) 555-5555</p>
          </div>
          <div className="mt-4">
            <Button>Contact Support</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
