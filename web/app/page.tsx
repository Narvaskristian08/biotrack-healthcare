import Link from 'next/link'
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  Cpu,
  FileCheck2,
  Landmark,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const TIERS = [
  {
    id: 'starter',
    name: 'Starter Coverage',
    price: 'PHP 65k - 120k / year',
    description: 'Pilot coverage for up to 20 barangays.',
    tag: 'Best for pilots',
    highlights: ['Municipal dashboard', 'Provider onboarding', 'Basic analytics'],
  },
  {
    id: 'citywide',
    name: 'Citywide Coverage',
    price: 'PHP 150k - 280k / year',
    description: 'Multi-barangay rollout with compliance support.',
    tag: 'Recommended rollout',
    highlights: ['City-wide monitoring', 'Governance workflows', 'Priority support'],
    featured: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise Coverage',
    price: 'Custom quote',
    description: 'Full governance controls and dedicated onboarding.',
    tag: 'Custom scope',
    highlights: ['Dedicated onboarding', 'Advanced RBAC', 'Compliance add-ons'],
  },
]

const ACCESS_CARDS = [
  {
    title: 'Municipality',
    description: 'Submit credentials and coverage preferences for city onboarding.',
    href: '/municipal-onboarding',
    cta: 'Apply now',
    icon: Landmark,
  },
  {
    title: 'Patient',
    description: 'Register to access verified health records and dashboards.',
    href: '/register',
    cta: 'Create patient account',
    icon: UserRound,
  },
  {
    title: 'Clinics and staff',
    description: 'Sign in with issued credentials to manage care workflows.',
    href: '/login',
    cta: 'Sign in',
    icon: Stethoscope,
  },
]

const VALUE_PILLARS = [
  {
    title: 'Municipal oversight',
    description: 'City-level visibility across barangay clinics and onboarding status.',
    icon: Building2,
  },
  {
    title: 'Verified onboarding',
    description: 'Credential checks and audit logs before access is granted.',
    icon: FileCheck2,
  },
  {
    title: 'Secure operations',
    description: 'Role-based access with monitoring and governance controls.',
    icon: ShieldCheck,
  },
]

const FLOW_STEPS = [
  {
    title: 'Apply with credentials',
    description: 'Submit the mayor or authorized secretary documents for verification.',
    icon: ClipboardList,
  },
  {
    title: 'Review and approve',
    description: 'We validate credentials and confirm coverage requirements.',
    icon: CheckCircle2,
  },
  {
    title: 'Activate and onboard',
    description: 'Municipal admin access is issued with guided setup.',
    icon: Cpu,
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="text-xl font-bold tracking-tight">BioTrack</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" className="text-sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/municipal-onboarding">Apply as Municipality</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/40 bg-linear-to-br from-background via-background to-primary/5">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Government-Ready Health Platform
              </div>

              <div className="space-y-4">
                <h1 className="text-5xl font-bold leading-tight tracking-tight md:text-6xl">
                  Municipal oversight, verified care, and patient safety.
                </h1>
                <p className="text-lg text-muted-foreground">
                  BioTrack supports mayors, city health offices, and barangay clinics with verified onboarding, secure records, and real-time monitoring in one comprehensive platform.
                </p>
              </div>

              <div className="flex flex-wrap gap-4 pt-2">
                <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Link href="/municipal-onboarding" className="gap-2">
                    Start Municipal Onboarding
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/register">Patient Sign Up</Link>
                </Button>
              </div>

              {/* Trust Badges */}
              <div className="space-y-3 pt-4">
                <div className="flex flex-wrap gap-4 text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span>Verified credentials</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span>Audit-ready</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <span>Role-based access</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Card */}
            <div className="relative">
              <div className="absolute -top-4 -right-4 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
              <Card className="relative border-primary/20 bg-card shadow-lg backdrop-blur">
                <CardHeader>
                  <CardTitle>Access Paths</CardTitle>
                  <CardDescription>Choose your role to get started.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {ACCESS_CARDS.map((card) => (
                    <Link key={card.title} href={card.href}>
                      <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/30 p-4 transition-all hover:border-primary/50 hover:bg-muted/50">
                        <card.icon className="mt-1 h-5 w-5 shrink-0 text-primary" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{card.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">{card.description}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <main className="mx-auto w-full max-w-7xl space-y-24 px-6 py-20">
        {/* Feature Highlights */}
        <section className="space-y-12">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Why BioTrack
            </div>
            <h2 className="text-4xl font-bold tracking-tight">A municipal-grade platform with verified access.</h2>
            <p className="text-lg text-muted-foreground">
              We keep onboarding strict and clear so each LGU gets the right tools without risk or confusion.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {VALUE_PILLARS.map((pillar) => (
              <Card key={pillar.title} className="border-border/50 bg-card hover:border-primary/50 transition-colors">
                <CardContent className="space-y-4 pt-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <pillar.icon className="h-6 w-6" />
                  </div>
                  <div className="space-y-2">
                    <p className="font-semibold text-base">{pillar.title}</p>
                    <p className="text-sm text-muted-foreground">{pillar.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Process Steps */}
        <section className="space-y-12">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Getting Started
            </div>
            <h2 className="text-4xl font-bold tracking-tight">Simple three-step onboarding process.</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {FLOW_STEPS.map((step, index) => (
              <div key={step.title} className="relative">
                {index < FLOW_STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-24 left-[60%] w-[40%] h-0.5 bg-linear-to-r from-primary/30 to-transparent" />
                )}
                <Card className="border-border/50 bg-card">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-sm">
                        {index + 1}
                      </div>
                      <step.icon className="h-5 w-5 text-primary/50" />
                    </div>
                    <CardTitle className="text-lg">{step.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing Section */}
        <section className="space-y-12 rounded-2xl border border-border/50 bg-muted/30 p-8 md:p-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary w-fit">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Transparent Pricing
              </div>
              <div className="space-y-2">
                <h2 className="text-4xl font-bold tracking-tight">Municipal coverage tiers</h2>
                <p className="text-muted-foreground">Pricing ranges are indicative and finalized after verification and scoping.</p>
              </div>
            </div>
            <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 w-fit">
              <Link href="/municipal-onboarding" className="gap-2">
                View Requirements
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {TIERS.map((tier) => (
              <Card
                key={tier.id}
                className={`border-border/50 bg-card ${tier.featured
                    ? 'md:scale-105 ring-2 ring-primary/50 shadow-lg'
                    : 'hover:border-primary/50 transition-colors'
                  }`}
              >
                <CardHeader>
                  <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary w-fit">
                    {tier.tag}
                  </div>
                  <CardTitle className="text-xl">{tier.name}</CardTitle>
                  <CardDescription>{tier.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <p className="text-3xl font-bold text-primary">{tier.price}</p>
                  <div className="space-y-3 border-t border-border/50 pt-6">
                    {tier.highlights.map((item) => (
                      <div key={item} className="flex items-start gap-3">
                        <span className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="rounded-2xl border border-primary/20 bg-linear-to-br from-primary/5 via-primary/2 to-background p-8 md:p-16">
          <div className="space-y-6 text-center">
            <div className="space-y-4">
              <h2 className="text-4xl font-bold tracking-tight md:text-5xl">Ready to onboard?</h2>
              <p className="text-lg text-muted-foreground">Submit credentials once. We'll guide your LGU through verification and activation.</p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center pt-4">
              <Button asChild size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href="/municipal-onboarding" className="gap-2">
                  Start Onboarding
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Sign In</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-muted/20 py-8">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-muted-foreground">
          <p>© 2024 BioTrack. Government-ready health platform for municipalities.</p>
        </div>
      </footer>
    </div>
  )
}
