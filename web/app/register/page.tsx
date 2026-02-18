'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Building2,
  Heart,
  Lock,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User,
  Eye,
  EyeOff,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  fetchHealthCenters,
  registerPatient,
  type HealthCenter,
  type PatientRegisterData,
} from '@/lib/auth'

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@(gmail|yahoo)\.com$/
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()\-_=+[\]{}|;:,.<>])[A-Za-z\d@$!%*?&#^()\-_=+[\]{}|;:,.<>]{8,}$/
const NAME_REGEX = /^[a-zA-Z\s\-']+$/
const STEP_LABELS = ['Identity', 'Contact', 'Security'] as const

function buildHealthCenterPrimaryLabel(center: HealthCenter): string {
  const barangay = String(center.barangayName ?? '').trim()
  const city = String(center.cityMunicipality ?? '').trim()

  if (barangay && city) return `${barangay}, ${city}`
  if (barangay) return barangay
  if (city) return city

  const fallback = String(center.name ?? center.healthCenterName ?? '').trim()
  return fallback || 'Unnamed Health Center'
}

function buildHealthCenterSecondaryLabel(center: HealthCenter): string {
  const healthCenterName = String(center.healthCenterName ?? '').trim()
  const address = String(center.address ?? '').trim()
  const contact = String(center.contactNumber ?? center.officialContactInfo ?? '').trim()

  const details = [healthCenterName, address, contact].filter(Boolean)
  const unique = details.filter((entry, idx, arr) => arr.indexOf(entry) === idx)
  return unique.join(' • ')
}

function RegisterHeroPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-gradient-to-br from-[#33c481] via-[#1fae6e] to-[#0f7a4e] lg:flex lg:items-center lg:justify-center lg:p-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_12%,rgba(255,255,255,0.26),transparent_36%),radial-gradient(circle_at_86%_86%,rgba(255,255,255,0.14),transparent_46%)]" />
      <img
        src="/assets/sdg/sdg-wheel-official.svg"
        alt="Official UN SDG wheel"
        className="pointer-events-none absolute -right-24 top-8 h-[24rem] w-[24rem] opacity-20 auth-wheel-spin"
      />

      <div className="relative z-10 w-full max-w-[560px] auth-enter-right">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-white/90 backdrop-blur-sm">
          <ShieldCheck className="h-3.5 w-3.5" />
          Official Health Goal Artwork
        </div>

        <div className="rounded-3xl border border-white/35 bg-[#0b3a2a]/80 p-6 shadow-[0_24px_54px_rgba(8,35,25,0.45)] backdrop-blur-md auth-soft-glow">
          <div className="grid grid-cols-[auto_1fr] gap-6">
            <div className="flex flex-col items-center gap-4">
              <img
                src="/assets/sdg/sdg3-official.svg"
                alt="Official UN Sustainable Development Goal 3 icon"
                className="h-24 w-24 rounded-2xl bg-white p-2 shadow-lg auth-float"
              />
              <img
                src="/assets/sdg/sdg3-official.png"
                alt="UN Good Health and Well-being goal"
                className="h-28 w-28 rounded-xl border border-white/35 object-cover"
              />
            </div>

            <div className="text-white">
              <p className="text-xs uppercase tracking-[0.18em] text-white/75">Goal 3</p>
              <h2 className="mt-2 text-3xl font-semibold leading-tight text-white">Good Health and Well-Being</h2>
              <p className="mt-3 text-sm text-white/85">
                Registering with BioTrack helps connect patients with verified care pathways and safer health journeys.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-white/85">
                <div className="rounded-xl border border-white/30 bg-white/10 px-3 py-2">Verified Enrollment</div>
                <div className="rounded-xl border border-white/30 bg-white/10 px-3 py-2">Patient Safety</div>
                <div className="rounded-xl border border-white/30 bg-white/10 px-3 py-2">Secure Records</div>
                <div className="rounded-xl border border-white/30 bg-white/10 px-3 py-2">Health Equity</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default function RegisterPage() {
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [healthCenters, setHealthCenters] = useState<HealthCenter[]>([])
  const [loadingHealthCenters, setLoadingHealthCenters] = useState(false)

  const [patientData, setPatientData] = useState({
    healthCenterId: '',
    lastName: '',
    firstName: '',
    middleInitial: '',
    nameExtension: '',
    email: '',
    password: '',
    confirmPassword: '',
    address: '',
    contactNumber: '',
    termsAccepted: false,
  })

  useEffect(() => {
    let mounted = true
    setLoadingHealthCenters(true)

    fetchHealthCenters()
      .then((result) => {
        if (!mounted) return
        if ('healthCenters' in result) {
          setHealthCenters(result.healthCenters)
        }
      })
      .finally(() => {
        if (mounted) {
          setLoadingHealthCenters(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [])

  const progressWidth = useMemo(() => `${(step / STEP_LABELS.length) * 100}%`, [step])
  const selectedHealthCenter = useMemo(
    () => healthCenters.find((center) => center._id === patientData.healthCenterId) ?? null,
    [healthCenters, patientData.healthCenterId]
  )
  const selectedHealthCenterDetails = useMemo(
    () => (selectedHealthCenter ? buildHealthCenterSecondaryLabel(selectedHealthCenter) : ''),
    [selectedHealthCenter]
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target

    if (['lastName', 'firstName'].includes(name) && value !== '' && !NAME_REGEX.test(value)) return
    if (name === 'middleInitial' && value.length > 1) return

    setPatientData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const validateStep1 = (): string | null => {
    if (!patientData.healthCenterId) return 'Please select a health center'
    if (!patientData.lastName.trim()) return 'Please enter your last name'
    if (!patientData.firstName.trim()) return 'Please enter your first name'
    if (!patientData.middleInitial.trim()) return 'Please enter your middle initial'
    return null
  }

  const validateStep2 = (): string | null => {
    if (!patientData.email.trim()) return 'Please enter your email address'
    if (!EMAIL_REGEX.test(patientData.email.trim())) return 'Please use a valid @gmail.com or @yahoo.com email'
    if (!patientData.address.trim()) return 'Please enter your address'
    if (!patientData.contactNumber.trim()) return 'Please enter your contact number'
    return null
  }

  const validateStep3 = (): string | null => {
    if (!patientData.password) return 'Please enter a password'
    if (!PASSWORD_REGEX.test(patientData.password)) {
      return 'Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character'
    }
    if (patientData.password !== patientData.confirmPassword) return 'Passwords do not match'
    if (!patientData.termsAccepted) return 'You must accept the terms and conditions'
    return null
  }

  const validateCurrentStep = (): string | null => {
    if (step === 1) return validateStep1()
    if (step === 2) return validateStep2()
    return validateStep3()
  }

  const handleNext = () => {
    setError('')
    const validationError = validateCurrentStep()
    if (validationError) {
      setError(validationError)
      return
    }
    setStep((prev) => Math.min(prev + 1, STEP_LABELS.length))
  }

  const handleBack = () => {
    setError('')
    setStep((prev) => Math.max(prev - 1, 1))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const validationError = validateStep3()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsLoading(true)

    const data: PatientRegisterData = {
      healthCenterId: patientData.healthCenterId,
      lastName: patientData.lastName.trim(),
      firstName: patientData.firstName.trim(),
      middleInitial: patientData.middleInitial.trim(),
      nameExtension: patientData.nameExtension.trim() || undefined,
      email: patientData.email.trim(),
      password: patientData.password,
      address: patientData.address.trim(),
      contactNumber: patientData.contactNumber.trim(),
    }

    const result = await registerPatient(data)
    setIsLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    const patientId = result.patient?.id
    if (!patientId) {
      setError('Registration completed but verification session is missing. Please try again.')
      return
    }

    const verificationQuery = new URLSearchParams({
      patientId,
      email: result.patient?.email ?? patientData.email,
      contactNumber: result.patient?.contactNumber ?? patientData.contactNumber,
    })

    router.push(`/account-verification?${verificationQuery.toString()}`)
  }

  return (
    <div className="h-screen overflow-hidden bg-[#eef8f2]">
      <div className="grid h-full lg:grid-cols-2">
        <section className="flex h-full items-center justify-center px-6 py-6 sm:px-10 lg:px-16 xl:px-20">
          <div className="flex h-full w-full max-w-[560px] flex-col auth-enter-left">
            <Link href="/" className="mb-6 inline-flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#12935f] to-[#33c481] text-white shadow-lg shadow-[#12935f]/30">
                <Heart className="h-6 w-6" />
              </span>
              <span className="text-[1.95rem] font-semibold tracking-tight text-[#111f1a]">BioTrack</span>
            </Link>

            <div className="auth-panel rounded-3xl p-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#e9f8f0] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#0f7a4e]">
                <Activity className="h-3.5 w-3.5" />
                Patient Registration
              </div>

              <h1 className="mt-4 text-[2rem] font-semibold leading-tight text-[#111f1a]">Create patient account</h1>
              <p className="mt-1 text-[1rem] text-[#4e6b5d]">Complete the guided flow to register securely.</p>

              <div className="mt-4 rounded-2xl border border-[#c7e6d7] bg-white p-4 shadow-sm">
                <div className="mb-3 h-2.5 w-full overflow-hidden rounded-full bg-[#e6f4ed]">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#12935f] to-[#22b573] transition-all duration-500" style={{ width: progressWidth }} />
                </div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  {STEP_LABELS.map((label, index) => {
                    const itemStep = index + 1
                    const active = itemStep <= step
                    return (
                      <div key={label} className="flex min-w-0 items-center gap-1.5">
                        <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${active ? 'bg-[#12935f] text-white' : 'bg-[#e2ece7] text-[#60776b]'}`}>
                          {itemStep}
                        </span>
                        <span className={`${active ? 'text-[#0f6f48]' : 'text-[#60776b]'} truncate`}>{label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {error ? (
                <div className="mt-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="mt-4 flex min-h-0 flex-1 flex-col rounded-2xl border border-[#c7e6d7] bg-white p-5 shadow-sm">
                <div key={step} className="min-h-0 flex-1 space-y-4 auth-enter-left">
                  {step === 1 ? (
                    <>
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-[#163428]">Health Center *</Label>
                        <Select
                          value={patientData.healthCenterId}
                          onValueChange={(value) => setPatientData((prev) => ({ ...prev, healthCenterId: value }))}
                          disabled={loadingHealthCenters}
                        >
                          <SelectTrigger className="h-11 rounded-xl border-[#cfe5d9] bg-white text-[#173328] focus:ring-2 focus:ring-[#12b76a]/30">
                            <SelectValue placeholder={loadingHealthCenters ? 'Loading health centers...' : 'Select your health center'} />
                          </SelectTrigger>
                          <SelectContent className="z-[140] max-h-72">
                            {healthCenters.map((hc) => (
                              <SelectItem key={hc._id} value={hc._id}>
                                {buildHealthCenterPrimaryLabel(hc)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedHealthCenterDetails ? (
                          <p className="text-xs text-[#5b786d] mt-1 px-1 truncate">
                            {selectedHealthCenterDetails}
                          </p>
                        ) : null}
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="lastName" className="text-sm font-semibold text-[#163428]">Last Name *</Label>
                          <div className="auth-input-shell relative rounded-xl">
                            <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a9387]" />
                            <Input
                              id="lastName"
                              name="lastName"
                              value={patientData.lastName}
                              onChange={handleChange}
                              placeholder="Dela Cruz"
                              className="h-11 border-0 bg-transparent pl-10 text-[#173328] placeholder:text-[#8fa398] shadow-none focus-visible:ring-0"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="firstName" className="text-sm font-semibold text-[#163428]">First Name *</Label>
                          <div className="auth-input-shell relative rounded-xl">
                            <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a9387]" />
                            <Input
                              id="firstName"
                              name="firstName"
                              value={patientData.firstName}
                              onChange={handleChange}
                              placeholder="Juan"
                              className="h-11 border-0 bg-transparent pl-10 text-[#173328] placeholder:text-[#8fa398] shadow-none focus-visible:ring-0"
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="middleInitial" className="text-sm font-semibold text-[#163428]">Middle Initial *</Label>
                          <div className="auth-input-shell relative rounded-xl">
                            <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a9387]" />
                            <Input
                              id="middleInitial"
                              name="middleInitial"
                              value={patientData.middleInitial}
                              onChange={handleChange}
                              placeholder="A"
                              maxLength={1}
                              className="h-11 border-0 bg-transparent pl-10 text-[#173328] placeholder:text-[#8fa398] shadow-none focus-visible:ring-0"
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="nameExtension" className="text-sm font-semibold text-[#163428]">Name Extension</Label>
                          <div className="auth-input-shell relative rounded-xl">
                            <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a9387]" />
                            <Input
                              id="nameExtension"
                              name="nameExtension"
                              value={patientData.nameExtension}
                              onChange={handleChange}
                              placeholder="Jr."
                              className="h-11 border-0 bg-transparent pl-10 text-[#173328] placeholder:text-[#8fa398] shadow-none focus-visible:ring-0"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  ) : null}

                  {step === 2 ? (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-semibold text-[#163428]">Email Address *</Label>
                        <div className="auth-input-shell relative rounded-xl">
                          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a9387]" />
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            value={patientData.email}
                            onChange={handleChange}
                            placeholder="your@gmail.com or your@yahoo.com"
                            className="h-11 border-0 bg-transparent pl-10 text-[#173328] placeholder:text-[#8fa398] shadow-none focus-visible:ring-0"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="address" className="text-sm font-semibold text-[#163428]">Address *</Label>
                        <div className="auth-input-shell relative rounded-xl">
                          <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a9387]" />
                          <Input
                            id="address"
                            name="address"
                            value={patientData.address}
                            onChange={handleChange}
                            placeholder="123 Main Street"
                            className="h-11 border-0 bg-transparent pl-10 text-[#173328] placeholder:text-[#8fa398] shadow-none focus-visible:ring-0"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="contactNumber" className="text-sm font-semibold text-[#163428]">Contact Number *</Label>
                        <div className="auth-input-shell relative rounded-xl">
                          <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a9387]" />
                          <Input
                            id="contactNumber"
                            name="contactNumber"
                            value={patientData.contactNumber}
                            onChange={handleChange}
                            placeholder="09123456789"
                            className="h-11 border-0 bg-transparent pl-10 text-[#173328] placeholder:text-[#8fa398] shadow-none focus-visible:ring-0"
                            required
                          />
                        </div>
                      </div>
                    </>
                  ) : null}

                  {step === 3 ? (
                    <>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="password" className="text-sm font-semibold text-[#163428]">Password *</Label>
                          <div className="auth-input-shell relative rounded-xl">
                            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a9387]" />
                            <Input
                              id="password"
                              name="password"
                              type={showPassword ? 'text' : 'password'}
                              value={patientData.password}
                              onChange={handleChange}
                              placeholder="********"
                              className="h-11 border-0 bg-transparent pl-10 pr-11 text-[#173328] placeholder:text-[#8fa398] shadow-none focus-visible:ring-0"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((prev) => !prev)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[#628175] transition-colors hover:text-[#173328]"
                              aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword" className="text-sm font-semibold text-[#163428]">Confirm Password *</Label>
                          <div className="auth-input-shell relative rounded-xl">
                            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a9387]" />
                            <Input
                              id="confirmPassword"
                              name="confirmPassword"
                              type={showConfirmPassword ? 'text' : 'password'}
                              value={patientData.confirmPassword}
                              onChange={handleChange}
                              placeholder="********"
                              className="h-11 border-0 bg-transparent pl-10 pr-11 text-[#173328] placeholder:text-[#8fa398] shadow-none focus-visible:ring-0"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword((prev) => !prev)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[#628175] transition-colors hover:text-[#173328]"
                              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                            >
                              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-[#cfe5d9] bg-[#f7fcf9] px-4 py-3">
                        <label htmlFor="patientTerms" className="flex items-start gap-3">
                          <Checkbox
                            id="patientTerms"
                            checked={patientData.termsAccepted}
                            onCheckedChange={(checked: boolean | 'indeterminate') =>
                              setPatientData((prev) => ({ ...prev, termsAccepted: checked === true }))
                            }
                            className="mt-0.5"
                          />
                          <span className="text-sm text-[#244638]">
                            I accept the terms and conditions and consent to health data processing for monitoring and care.
                            <span className="mt-1 block text-xs text-[#5b786d]">
                              <button
                                type="button"
                                onClick={() => window.dispatchEvent(new CustomEvent('openPolicy', { detail: { mode: 'privacy' } }))}
                                className="underline underline-offset-2 hover:text-[#0f8f60]"
                              >
                                Privacy Policy
                              </button>
                              <span className="px-2">•</span>
                              <button
                                type="button"
                                onClick={() => window.dispatchEvent(new CustomEvent('openPolicy', { detail: { mode: 'terms' } }))}
                                className="underline underline-offset-2 hover:text-[#0f8f60]"
                              >
                                Terms of Service
                              </button>
                            </span>
                          </span>
                        </label>
                      </div>

                      <div className="rounded-xl border border-[#cbeedd] bg-[#ecfff4] px-4 py-3 text-sm text-[#0f6f48]">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Admin accounts are fixed and provisioned by the system owner.
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={step === 1 || isLoading}
                    className="h-11 rounded-xl border-[#cfe5d9] bg-white text-[#1f3c30] hover:bg-[#f3faf6]"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>

                  {step < STEP_LABELS.length ? (
                    <Button
                      type="button"
                      onClick={handleNext}
                      disabled={isLoading}
                      className="h-11 rounded-xl bg-[#0f8f60] px-6 text-white shadow-md shadow-[#0f8f60]/25 transition-all hover:-translate-y-0.5 hover:bg-[#0c7a52]"
                    >
                      Next
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={isLoading}
                      className="h-11 rounded-xl bg-[#0f8f60] px-6 text-white shadow-md shadow-[#0f8f60]/25 transition-all hover:-translate-y-0.5 hover:bg-[#0c7a52]"
                    >
                      {isLoading ? 'Creating account...' : 'Create Account'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </form>
            </div>

            <p className="mt-3 text-center text-sm text-[#57756a]">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-[#0f8f60] underline-offset-4 hover:underline">
                Sign in
              </Link>
            </p>

            <p className="mt-2 text-center text-xs text-[#6b8579]">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('openPolicy', { detail: { mode: 'privacy' } }))}
                className="underline underline-offset-2 hover:text-[#0f8f60]"
              >
                Privacy Policy
              </button>
              <span className="px-2">•</span>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('openPolicy', { detail: { mode: 'terms' } }))}
                className="underline underline-offset-2 hover:text-[#0f8f60]"
              >
                Terms of Service
              </button>
            </p>

            <p className="mt-2 text-center text-xs text-[#7f998f]">Copyright 2026 BioTrack. All rights reserved.</p>
          </div>
        </section>

        <RegisterHeroPanel />
      </div>
    </div>
  )
}
