'use client'

import { HelpCircle, Mail, Phone, MessageCircle, BookOpen } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import DashboardLayout from '@/components/dashboard-layout'
import Link from 'next/link'

const faqs = [
  {
    q: 'How do I export my health summary?',
    a: 'Go to Reports & Downloads, choose your report type and date range, then click Generate Report or download an existing report.',
  },
  {
    q: 'How is my data stored?',
    a: 'Your data is encrypted and stored securely. See our Privacy Policy for details on encryption, retention, and data handling.',
  },
  {
    q: 'Who can view my records?',
    a: 'Only healthcare providers with your consent and verified access can view your records. You control sharing in Profile & Settings.',
  },
  {
    q: 'How do I update my vital readings?',
    a: 'Use Health Monitoring to add a self-monitoring entry on web, or use the mobile vital scan. Provider-issued readings will also appear in your records.',
  },
  {
    q: 'How do I verify my medical records?',
    a: 'Each record shows a blockchain verification hash. You can view and copy the hash on the Medical Records page.',
  },
]

export default function HelpSupportPage() {
  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-5xl">
        <header className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Help & Support</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            FAQs, contact information, and usage guides
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Frequently Asked Questions
            </CardTitle>
            <CardDescription>Quick answers to common questions</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {faqs.map((faq, i) => (
                <li key={i} className="p-4 rounded-lg border border-border bg-muted/30">
                  <p className="font-medium text-sm text-foreground mb-1">{faq.q}</p>
                  <p className="text-sm text-muted-foreground">{faq.a}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Contact support
            </CardTitle>
            <CardDescription>Reach us by email or phone</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
                <Mail className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">support@biotrack.example</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
                <Phone className="h-5 w-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium">+1 (555) 555-5555</p>
                </div>
              </div>
            </div>
            <Button className="gap-2" asChild>
              <a href="mailto:support@biotrack.example">
                <Mail className="h-4 w-4" />
                Contact support
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <HelpCircle className="h-5 w-5 text-primary" />
              More resources
            </CardTitle>
            <CardDescription>Privacy, terms, and documentation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => window.dispatchEvent(new CustomEvent('openPolicy', { detail: { mode: 'privacy' } }))}
            >
              Privacy policy
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => window.dispatchEvent(new CustomEvent('openPolicy', { detail: { mode: 'terms' } }))}
            >
              Terms of service
            </Button>
            <Link href="/about">
              <Button variant="outline" className="w-full justify-start gap-2">
                About BioTrack
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
