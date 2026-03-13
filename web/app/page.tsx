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
    <div className="min-h-screen bg-[#f6f7fb] text-foreground">
      <header className="relative overflow-hidden bg-[#0c5d3a] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(36,255,190,0.25),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.18),transparent_40%)]" />
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(120deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.02)_40%,transparent_70%),linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:100%_100%,32px_32px,32px_32px]" />

        <div className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-white shadow-lg shadow-black/10">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <span className="text-2xl font-semibold tracking-tight">BioTrack</span>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="secondary" className="bg-white/15 text-white hover:bg-white/25">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild className="bg-white text-[#0c5d3a] hover:bg-white/90">
              <Link href="/municipal-onboarding">Apply as Municipality</Link>
            </Button>
          </div>
        </div>

        <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-6 pb-24 pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-7 auth-enter-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/85">
              Government-ready health platform
            </div>
            <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
              Municipal oversight, verified care, and patient safety in one platform.
            </h1>
            <p className="text-base text-white/85">
              BioTrack supports mayors, city health offices, and barangay clinics with onboarding verification, secure
              records, and real-time monitoring.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="bg-white text-[#0c5d3a] hover:bg-white/90">
                <Link href="/municipal-onboarding">
                  Start municipal onboarding
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10">
                <Link href="/register">Patient sign up</Link>
              </Button>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-white/80">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Verified credentials
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Audit-ready onboarding
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Role-based access
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Credential gate</p>
                <p className="mt-2 text-base font-semibold">Verified only</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">City coverage</p>
                <p className="mt-2 text-base font-semibold">Barangay ready</p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Audit logs</p>
                <p className="mt-2 text-base font-semibold">Always tracked</p>
              </div>
            </div>
          </div>

          <div className="relative auth-enter-right">
            <div className="absolute -top-6 right-8 h-24 w-24 rounded-full bg-[#7cf2c0]/40 blur-2xl" />
            <div className="absolute bottom-10 left-0 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <Card className="border-white/20 bg-white/10 text-white shadow-xl backdrop-blur">
              <CardHeader>
                <CardTitle className="text-xl">Choose your access path</CardTitle>
                <CardDescription className="text-white/70">Go to the right flow instantly.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {ACCESS_CARDS.map((card) => (
                  <div key={card.title} className="rounded-xl border border-white/20 bg-white/10 p-4">
                    <div className="flex items-start gap-3">
                      <card.icon className="h-5 w-5 text-white" />
                      <div>
                        <p className="font-semibold">{card.title}</p>
                        <p className="text-xs text-white/70">{card.description}</p>
                      </div>
                    </div>
                    <Button
                      asChild
                      size="sm"
                      variant={card.title === 'Municipality' ? 'default' : 'outline'}
                      className={
                        card.title === 'Municipality'
                          ? 'mt-3 bg-white text-[#0c5d3a] hover:bg-white/90'
                          : 'mt-3 border-white/40 text-white hover:bg-white/10'
                      }
                    >
                      <Link href={card.href}>{card.cta}</Link>
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl space-y-20 px-6 py-16">
        <section className="flex flex-col gap-4 rounded-2xl border border-[#dfe9e2] bg-white px-6 py-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#0c5d3a]">Built for LGU health leadership</p>
            <p className="text-xs text-muted-foreground">Clear onboarding paths for municipal, clinic, and patient users.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#0c5d3a]">
            <span className="rounded-full bg-[#eef7f1] px-3 py-1">Municipal onboarding</span>
            <span className="rounded-full bg-[#eef7f1] px-3 py-1">Secure records</span>
            <span className="rounded-full bg-[#eef7f1] px-3 py-1">Audit logs</span>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Why BioTrack</p>
            <h2 className="text-3xl font-semibold">A municipal-grade platform with verified access.</h2>
            <p className="text-sm text-muted-foreground">
              We keep onboarding strict and clear so each LGU gets the right tools without risk or confusion.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {VALUE_PILLARS.map((pillar) => (
              <Card key={pillar.title} className="border-slate-200 bg-white shadow-sm">
                <CardContent className="space-y-3 pt-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf8f1] text-[#0c5d3a]">
                    <pillar.icon className="h-5 w-5" />
                  </div>
                  <p className="text-base font-semibold">{pillar.title}</p>
                  <p className="text-sm text-muted-foreground">{pillar.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          {FLOW_STEPS.map((step, index) => (
            <Card key={step.title} className="border-slate-200 bg-white">
              <CardHeader>
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <span>Step {index + 1}</span>
                  <step.icon className="h-4 w-4 text-[#0c5d3a]" />
                </div>
                <CardTitle className="text-lg">{step.title}</CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </section>

        <section className="rounded-3xl border border-[#dfe9e2] bg-gradient-to-br from-white via-[#f8fbf9] to-[#eef7f1] p-8 shadow-sm md:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Pricing preview</p>
              <h2 className="text-3xl font-semibold">Municipal coverage tiers</h2>
              <p className="text-sm text-muted-foreground">
                Pricing ranges are indicative and finalized after verification and scoping.
              </p>
            </div>
            <Button asChild size="lg" className="bg-[#0c5d3a] text-white hover:bg-[#0a5032]">
              <Link href="/municipal-onboarding">
                View onboarding requirements
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {TIERS.map((tier) => (
              <Card
                key={tier.id}
                className={`border-slate-200 bg-white shadow-sm ${
                  tier.id === 'citywide' ? 'ring-2 ring-[#0c5d3a]/25' : ''
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="inline-flex w-fit items-center rounded-full bg-[#eef7f1] px-3 py-1 text-xs font-semibold text-[#0c5d3a]">
                    {tier.tag}
                  </div>
                  <CardTitle className="text-xl">{tier.name}</CardTitle>
                  <CardDescription>{tier.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-2xl font-semibold text-[#0c5d3a]">{tier.price}</p>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    {tier.highlights.map((item) => (
                      <div key={item} className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-[#0c5d3a]" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Verified onboarding</p>
            <h2 className="text-3xl font-semibold">Only verified municipal admins get activated.</h2>
            <p className="text-sm text-muted-foreground">
              Submit proof of authority and we validate credentials before issuing municipal access.
            </p>
          </div>
          <Card className="border-slate-200 bg-white">
            <CardContent className="space-y-3 pt-6 text-sm text-muted-foreground">
              <p>1. Upload credentials for the mayor or authorized secretary.</p>
              <p>2. We review and verify documents within the onboarding queue.</p>
              <p>3. Approved accounts receive setup instructions and support.</p>
            </CardContent>
          </Card>
        </section>

        <section className="rounded-3xl border border-[#dfe9e2] bg-[#0c5d3a] px-8 py-10 text-white md:px-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Ready to onboard</p>
              <h2 className="text-3xl font-semibold">Start the municipal onboarding flow today.</h2>
              <p className="text-sm text-white/80">
                Submit credentials once. We will guide your LGU through verification and activation.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-white text-[#0c5d3a] hover:bg-white/90">
                <Link href="/municipal-onboarding">
                  Apply for municipal access
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
