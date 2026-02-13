'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Heart,
  Mail,
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Eye,
  EyeOff,
  Building2,
  MapPin,
  Phone,
  Shield,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
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
  registerHealthCenter,
  registerAdmin,
  type HealthCenter,
  type PatientRegisterData,
  type HealthCenterRegisterData,
  type AdminRegisterData,
} from '@/lib/auth'

// Email: only @gmail.com or @yahoo.com
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@(gmail|yahoo)\.com$/
// Password: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()\-_=+[\]{}|;:,.<>])[A-Za-z\d@$!%*?&#^()\-_=+[\]{}|;:,.<>]{8,}$/
// Name regex: letters, spaces, hyphens, apostrophes only
const NAME_REGEX = /^[a-zA-Z\s\-']+$/

type SignUpRole = 'patient' | 'provider' | 'admin'

const ROLES: { value: SignUpRole; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'patient', label: 'Patient', icon: <User className="h-5 w-5" />, description: 'Access your health records' },
  { value: 'admin', label: 'Admin', icon: <Shield className="h-5 w-5" />, description: 'System administration' },
]

const STEP_TITLES = {
  patient: ['Select Role', 'Personal Information', 'Account Security'],
  provider: ['Select Role', 'Center Information', 'Account Security'],
  admin: ['Select Role', 'Account Information', 'Confirmation'],
}

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [selectedRole, setSelectedRole] = useState<SignUpRole>('patient')
  const [error, setError] = useState('')
  const [healthCenters, setHealthCenters] = useState<HealthCenter[]>([])
  const [loadingHealthCenters, setLoadingHealthCenters] = useState(false)

  // Patient form data
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

  // Health Center form data
  const [healthCenterData, setHealthCenterData] = useState({
    name: '',
    holderName: '',
    email: '',
    password: '',
    confirmPassword: '',
    address: '',
    contactNumber: '',
    termsAccepted: false,
  })

  // Admin form data
  const [adminData, setAdminData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    termsAccepted: false,
  })

  // Fetch health centers when patient role is selected at step 2
  useEffect(() => {
    if (selectedRole === 'patient' && step === 2 && healthCenters.length === 0) {
      setLoadingHealthCenters(true)
      fetchHealthCenters().then((result) => {
        if ('healthCenters' in result) {
          setHealthCenters(result.healthCenters)
        }
        setLoadingHealthCenters(false)
      })
    }
  }, [selectedRole, step, healthCenters.length])

  const handleRoleSelect = (role: SignUpRole) => {
    setSelectedRole(role)
    setError('')
  }

  const handleStep1 = () => {
    setStep(2)
    setError('')
  }

  // ============== Patient Handlers ==============
  const handlePatientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target

    // Validate name fields
    if (['lastName', 'firstName'].includes(name) && value !== '' && !NAME_REGEX.test(value)) return
    if (name === 'middleInitial' && value.length > 1) return

    setPatientData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const validatePatientStep2 = (): string | null => {
    if (!patientData.healthCenterId) return 'Please select a health center'
    if (!patientData.lastName.trim()) return 'Please enter your last name'
    if (!patientData.firstName.trim()) return 'Please enter your first name'
    if (!patientData.middleInitial.trim()) return 'Please enter your middle initial'
    if (!patientData.email.trim()) return 'Please enter your email address'
    if (!EMAIL_REGEX.test(patientData.email.trim())) return 'Please use a valid @gmail.com or @yahoo.com email'
    if (!patientData.address.trim()) return 'Please enter your address'
    if (!patientData.contactNumber.trim()) return 'Please enter your contact number'
    return null
  }

  const validatePatientStep3 = (): string | null => {
    if (!patientData.password) return 'Please enter a password'
    if (!PASSWORD_REGEX.test(patientData.password)) {
      return 'Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character'
    }
    if (patientData.password !== patientData.confirmPassword) return 'Passwords do not match'
    if (!patientData.termsAccepted) return 'You must accept the terms and conditions'
    return null
  }

  const handlePatientStep2 = () => {
    const validationError = validatePatientStep2()
    if (validationError) {
      setError(validationError)
      return
    }
    setStep(3)
    setError('')
  }

  const handlePatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const validationError = validatePatientStep3()
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

  // ============== Health Center Handlers ==============
  const handleHealthCenterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setHealthCenterData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const validateHealthCenterStep2 = (): string | null => {
    if (!healthCenterData.name.trim()) return 'Please enter the health center name'
    if (!healthCenterData.holderName.trim()) return 'Please enter the holder name'
    if (!healthCenterData.email.trim()) return 'Please enter an email address'
    if (!EMAIL_REGEX.test(healthCenterData.email.trim())) return 'Please use a valid @gmail.com or @yahoo.com email'
    return null
  }

  const validateHealthCenterStep3 = (): string | null => {
    if (!healthCenterData.password) return 'Please enter a password'
    if (!PASSWORD_REGEX.test(healthCenterData.password)) {
      return 'Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character'
    }
    if (healthCenterData.password !== healthCenterData.confirmPassword) return 'Passwords do not match'
    if (!healthCenterData.termsAccepted) return 'You must accept the terms and conditions'
    return null
  }

  const handleHealthCenterStep2 = () => {
    const validationError = validateHealthCenterStep2()
    if (validationError) {
      setError(validationError)
      return
    }
    setStep(3)
    setError('')
  }

  const handleHealthCenterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const validationError = validateHealthCenterStep3()
    if (validationError) {
      setError(validationError)
      return
    }

    setIsLoading(true)

    const data: HealthCenterRegisterData = {
      name: healthCenterData.name.trim(),
      holderName: healthCenterData.holderName.trim(),
      email: healthCenterData.email.trim(),
      password: healthCenterData.password,
      address: healthCenterData.address.trim() || undefined,
      contactNumber: healthCenterData.contactNumber.trim() || undefined,
    }

    const result = await registerHealthCenter(data)
    setIsLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    router.push('/')
  }

  // ============== Admin Handlers ==============
  const handleAdminChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setAdminData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const validateAdminStep2 = (): string | null => {
    if (!adminData.email.trim()) return 'Please enter an email address'
    if (!EMAIL_REGEX.test(adminData.email.trim())) return 'Please use a valid @gmail.com or @yahoo.com email'
    if (!adminData.password) return 'Please enter a password'
    if (!PASSWORD_REGEX.test(adminData.password)) {
      return 'Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character'
    }
    if (adminData.password !== adminData.confirmPassword) return 'Passwords do not match'
    return null
  }

  const handleAdminStep2 = () => {
    const validationError = validateAdminStep2()
    if (validationError) {
      setError(validationError)
      return
    }
    setStep(3)
    setError('')
  }

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!adminData.termsAccepted) {
      setError('You must accept the terms and conditions')
      return
    }

    setIsLoading(true)

    const data: AdminRegisterData = {
      email: adminData.email.trim(),
      password: adminData.password,
    }

    const result = await registerAdmin(data)
    setIsLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    router.push('/')
  }

  // ============== Render Helpers ==============
  const renderTermsSection = (
    checked: boolean,
    onChange: (checked: boolean) => void,
    id: string
  ) => (
    <div className="space-y-3 p-4 rounded-lg bg-muted/50 border border-border">
      <p className="text-sm font-semibold">Terms & Conditions</p>
      <div className="text-xs text-muted-foreground space-y-2 max-h-28 overflow-y-auto">
        <p>
          By creating an account, you agree to BioTrack&apos;s Terms of Service and Privacy Policy. You consent to the collection and processing of your health data for monitoring, insights, and care.
        </p>
      </div>
      <div className="flex items-start gap-3">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={(c: boolean | 'indeterminate') => onChange(c === true)}
          className="mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <Label htmlFor={id} className="text-sm cursor-pointer font-medium">
            I accept the terms and conditions
          </Label>
          <p className="mt-1 flex flex-wrap gap-x-2 gap-y-0 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('openPolicy', { detail: { mode: 'terms' } }))}
              className="underline hover:text-foreground"
            >
              Terms
            </button>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('openPolicy', { detail: { mode: 'privacy' } }))}
              className="underline hover:text-foreground"
            >
              Privacy
            </button>
          </p>
        </div>
      </div>
    </div>
  )

  const stepTitles = STEP_TITLES[selectedRole]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4 sm:p-6">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-20 right-20 w-80 h-80 bg-primary/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-40 left-20 w-80 h-80 bg-secondary/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-[520px] animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg shadow-primary/25 ring-2 ring-primary/20">
              <Heart className="h-7 w-7 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent tracking-tight">
                BioTrack
              </h1>
              <p className="text-xs text-muted-foreground font-medium">Healthcare Platform</p>
            </div>
          </div>
        </div>

        {/* Progress - 3 steps */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1 flex flex-col gap-1.5">
              <div
                className={`h-1.5 rounded-full transition-colors ${s <= step ? 'bg-primary' : 'bg-muted'
                  }`}
              />
              <span className={`text-xs text-center ${s <= step ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                {stepTitles[s - 1]}
              </span>
            </div>
          ))}
        </div>

        <Card className="border-border/60 shadow-xl shadow-black/5 dark:shadow-none bg-card/95 backdrop-blur-sm overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-primary via-secondary to-primary" />
          <CardHeader className="space-y-1.5 pb-4">
            <CardTitle className="text-2xl font-semibold tracking-tight">Create Account</CardTitle>
            <CardDescription>
              Step {step} of 3: {stepTitles[step - 1]}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {error && (
              <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive font-medium">
                {error}
              </div>
            )}

            {/* Step 1: Role Selection */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="space-y-3">
                  {ROLES.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => handleRoleSelect(r.value)}
                      className={`w-full p-4 rounded-lg border-2 transition-all flex items-center gap-4 text-left ${selectedRole === r.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                        }`}
                    >
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${selectedRole === r.value ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                        }`}>
                        {r.icon}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{r.label}</p>
                        <p className="text-sm text-muted-foreground">{r.description}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selectedRole === r.value ? 'border-primary bg-primary' : 'border-muted-foreground'
                        }`}>
                        {selectedRole === r.value && <CheckCircle className="h-3 w-3 text-white" />}
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Barangay/healthcare-provider onboarding is admin-managed and cannot be self-registered.
                </p>

                <Button onClick={handleStep1} className="w-full h-11 gap-2 rounded-lg font-medium shadow-sm">
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* ==================== PATIENT STEPS ==================== */}

            {/* Step 2: Patient Personal Info */}
            {step === 2 && selectedRole === 'patient' && (
              <div className="space-y-4">
                {/* Health Center Selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Health Center *</Label>
                  <Select
                    value={patientData.healthCenterId}
                    onValueChange={(value) => setPatientData((prev) => ({ ...prev, healthCenterId: value }))}
                    disabled={loadingHealthCenters}
                  >
                    <SelectTrigger className="h-11 rounded-lg">
                      <SelectValue placeholder={loadingHealthCenters ? 'Loading...' : 'Select your health center'} />
                    </SelectTrigger>
                    <SelectContent>
                      {healthCenters.map((hc) => (
                        <SelectItem key={hc._id} value={hc._id}>
                          {hc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium">Last Name *</Label>
                    <div className="relative group">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                      <Input
                        id="lastName"
                        name="lastName"
                        placeholder="Dela Cruz"
                        value={patientData.lastName}
                        onChange={handlePatientChange}
                        className="pl-10 h-11 rounded-lg border-border/80 focus-visible:ring-2"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium">First Name *</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      placeholder="Juan"
                      value={patientData.firstName}
                      onChange={handlePatientChange}
                      className="h-11 rounded-lg border-border/80 focus-visible:ring-2"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="middleInitial" className="text-sm font-medium">Middle Initial *</Label>
                    <Input
                      id="middleInitial"
                      name="middleInitial"
                      placeholder="A"
                      value={patientData.middleInitial}
                      onChange={handlePatientChange}
                      className="h-11 rounded-lg border-border/80 focus-visible:ring-2"
                      maxLength={1}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nameExtension" className="text-sm font-medium">Suffix</Label>
                    <Input
                      id="nameExtension"
                      name="nameExtension"
                      placeholder="Jr., Sr., III"
                      value={patientData.nameExtension}
                      onChange={handlePatientChange}
                      className="h-11 rounded-lg border-border/80 focus-visible:ring-2"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email Address *</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@gmail.com"
                      value={patientData.email}
                      onChange={handlePatientChange}
                      className="pl-10 h-11 rounded-lg border-border/80 focus-visible:ring-2"
                      required
                    />
                  </div>
                </div>

                {/* Address & Contact */}
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-sm font-medium">Address *</Label>
                  <div className="relative group">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="address"
                      name="address"
                      placeholder="123 Main St, Barangay, City"
                      value={patientData.address}
                      onChange={handlePatientChange}
                      className="pl-10 h-11 rounded-lg border-border/80 focus-visible:ring-2"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactNumber" className="text-sm font-medium">Contact Number *</Label>
                  <div className="relative group">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="contactNumber"
                      name="contactNumber"
                      placeholder="09123456789"
                      value={patientData.contactNumber}
                      onChange={handlePatientChange}
                      className="pl-10 h-11 rounded-lg border-border/80 focus-visible:ring-2"
                      required
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1 h-11 rounded-lg gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <Button type="button" onClick={handlePatientStep2} className="flex-1 h-11 gap-2 rounded-lg font-medium shadow-sm">
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Patient Account Security */}
            {step === 3 && selectedRole === 'patient' && (
              <form onSubmit={handlePatientSubmit} className="space-y-4">
                {/* Password Fields */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">Password *</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={patientData.password}
                      onChange={handlePatientChange}
                      className="pl-10 pr-11 h-11 rounded-lg border-border/80 focus-visible:ring-2"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Min 8 characters with uppercase, lowercase, number, and special character
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password *</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={patientData.confirmPassword}
                      onChange={handlePatientChange}
                      className="pl-10 pr-11 h-11 rounded-lg border-border/80 focus-visible:ring-2"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Terms */}
                {renderTermsSection(
                  patientData.termsAccepted,
                  (checked) => setPatientData((prev) => ({ ...prev, termsAccepted: checked })),
                  'patientTerms'
                )}

                {/* Buttons */}
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1 h-11 rounded-lg gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <Button type="submit" disabled={isLoading} className="flex-1 h-11 gap-2 rounded-lg font-medium shadow-sm">
                    {isLoading ? 'Creating...' : 'Create Account'}
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            )}

            {/* ==================== HEALTH CENTER STEPS ==================== */}

            {/* Step 2: Health Center Info */}
            {step === 2 && selectedRole === 'provider' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hcName" className="text-sm font-medium">Health Center Name *</Label>
                  <div className="relative group">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="hcName"
                      name="name"
                      placeholder="City Health Center"
                      value={healthCenterData.name}
                      onChange={handleHealthCenterChange}
                      className="pl-10 h-11 rounded-lg border-border/80 focus-visible:ring-2"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="holderName" className="text-sm font-medium">Holder Name *</Label>
                  <div className="relative group">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="holderName"
                      name="holderName"
                      placeholder="Dr. Juan Dela Cruz"
                      value={healthCenterData.holderName}
                      onChange={handleHealthCenterChange}
                      className="pl-10 h-11 rounded-lg border-border/80 focus-visible:ring-2"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hcEmail" className="text-sm font-medium">Email Address *</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="hcEmail"
                      name="email"
                      type="email"
                      placeholder="center@gmail.com"
                      value={healthCenterData.email}
                      onChange={handleHealthCenterChange}
                      className="pl-10 h-11 rounded-lg border-border/80 focus-visible:ring-2"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hcAddress" className="text-sm font-medium">Address</Label>
                  <div className="relative group">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="hcAddress"
                      name="address"
                      placeholder="123 Main St, City"
                      value={healthCenterData.address}
                      onChange={handleHealthCenterChange}
                      className="pl-10 h-11 rounded-lg border-border/80 focus-visible:ring-2"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hcContact" className="text-sm font-medium">Contact Number</Label>
                  <div className="relative group">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="hcContact"
                      name="contactNumber"
                      placeholder="09123456789"
                      value={healthCenterData.contactNumber}
                      onChange={handleHealthCenterChange}
                      className="pl-10 h-11 rounded-lg border-border/80 focus-visible:ring-2"
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1 h-11 rounded-lg gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <Button type="button" onClick={handleHealthCenterStep2} className="flex-1 h-11 gap-2 rounded-lg font-medium shadow-sm">
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Health Center Account Security */}
            {step === 3 && selectedRole === 'provider' && (
              <form onSubmit={handleHealthCenterSubmit} className="space-y-4">
                {/* Password Fields */}
                <div className="space-y-2">
                  <Label htmlFor="hcPassword" className="text-sm font-medium">Password *</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="hcPassword"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={healthCenterData.password}
                      onChange={handleHealthCenterChange}
                      className="pl-10 pr-11 h-11 rounded-lg border-border/80 focus-visible:ring-2"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Min 8 characters with uppercase, lowercase, number, and special character
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hcConfirmPassword" className="text-sm font-medium">Confirm Password *</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="hcConfirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={healthCenterData.confirmPassword}
                      onChange={handleHealthCenterChange}
                      className="pl-10 pr-11 h-11 rounded-lg border-border/80 focus-visible:ring-2"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Terms */}
                {renderTermsSection(
                  healthCenterData.termsAccepted,
                  (checked) => setHealthCenterData((prev) => ({ ...prev, termsAccepted: checked })),
                  'hcTerms'
                )}

                {/* Buttons */}
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1 h-11 rounded-lg gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <Button type="submit" disabled={isLoading} className="flex-1 h-11 gap-2 rounded-lg font-medium shadow-sm">
                    {isLoading ? 'Creating...' : 'Create Account'}
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            )}

            {/* ==================== ADMIN STEPS ==================== */}

            {/* Step 2: Admin Account Info */}
            {step === 2 && selectedRole === 'admin' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="adminEmail" className="text-sm font-medium">Email Address *</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="adminEmail"
                      name="email"
                      type="email"
                      placeholder="admin@gmail.com"
                      value={adminData.email}
                      onChange={handleAdminChange}
                      className="pl-10 h-11 rounded-lg border-border/80 focus-visible:ring-2"
                      required
                    />
                  </div>
                </div>

                {/* Password Fields */}
                <div className="space-y-2">
                  <Label htmlFor="adminPassword" className="text-sm font-medium">Password *</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="adminPassword"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={adminData.password}
                      onChange={handleAdminChange}
                      className="pl-10 pr-11 h-11 rounded-lg border-border/80 focus-visible:ring-2"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Min 8 characters with uppercase, lowercase, number, and special character
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminConfirmPassword" className="text-sm font-medium">Confirm Password *</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="adminConfirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={adminData.confirmPassword}
                      onChange={handleAdminChange}
                      className="pl-10 pr-11 h-11 rounded-lg border-border/80 focus-visible:ring-2"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1 rounded"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1 h-11 rounded-lg gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <Button type="button" onClick={handleAdminStep2} className="flex-1 h-11 gap-2 rounded-lg font-medium shadow-sm">
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Admin Confirmation */}
            {step === 3 && selectedRole === 'admin' && (
              <form onSubmit={handleAdminSubmit} className="space-y-4">
                {/* Summary */}
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <p className="text-sm font-semibold mb-3">Account Summary</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Role:</span>
                      <span className="font-medium">Administrator</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium">{adminData.email}</span>
                    </div>
                  </div>
                </div>

                {/* Terms */}
                {renderTermsSection(
                  adminData.termsAccepted,
                  (checked) => setAdminData((prev) => ({ ...prev, termsAccepted: checked })),
                  'adminTerms'
                )}

                {/* Buttons */}
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1 h-11 rounded-lg gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <Button type="submit" disabled={isLoading} className="flex-1 h-11 gap-2 rounded-lg font-medium shadow-sm">
                    {isLoading ? 'Creating...' : 'Create Account'}
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            )}

            <p className="text-center text-sm text-muted-foreground pt-2">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline font-semibold">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          <p>© 2026 BioTrack. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
