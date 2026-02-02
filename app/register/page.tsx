'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Heart, Mail, Lock, User, ArrowRight, CheckCircle, Eye, EyeOff, Users, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

// Full name: letters, spaces, hyphens, apostrophes only (no numbers)
const FULL_NAME_REGEX = /^[a-zA-Z\s\-']+$/
// Email: only @gmail.com or @yahoo.com
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@(gmail|yahoo)\.com$/
// Password: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()\-_=+[\]{}|;:,.<>])[A-Za-z\d@$!%*?&#^()\-_=+[\]{}|;:,.<>]{8,}$/

type SignUpRole = 'patient' | 'provider' | 'admin'

const ROLES: { value: SignUpRole; label: string; icon: React.ReactNode }[] = [
  { value: 'patient', label: 'Patient', icon: <User className="h-4 w-4" /> },
  { value: 'provider', label: 'Healthcare Provider', icon: <Users className="h-4 w-4" /> },
  { value: 'admin', label: 'Admin', icon: <Shield className="h-4 w-4" /> },
]

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    role: 'patient' as SignUpRole,
    password: '',
    confirmPassword: '',
    termsAccepted: false,
  })
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    if (name === 'fullName' && value !== '' && !FULL_NAME_REGEX.test(value)) return
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.fullName.trim()) {
      setError('Please enter your full name')
      return
    }
    if (!FULL_NAME_REGEX.test(formData.fullName.trim())) {
      setError('Full name must contain letters only (no numbers). Spaces, hyphens and apostrophes allowed.')
      return
    }
    if (!formData.email.trim()) {
      setError('Please enter your email address')
      return
    }
    if (!EMAIL_REGEX.test(formData.email.trim())) {
      setError('Please use a valid @gmail.com or @yahoo.com email address')
      return
    }

    setStep(2)
  }

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.password) {
      setError('Please enter a password')
      return
    }
    if (!PASSWORD_REGEX.test(formData.password)) {
      setError(
        'Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character (@$!%*?&#^()\-_=+[]{}|;:,.<>)'
      )
      return
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (!formData.termsAccepted) {
      setError('You must accept the terms and conditions')
      return
    }

    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))

    localStorage.setItem(
      'userSession',
      JSON.stringify({
        email: formData.email,
        name: formData.fullName,
        role: formData.role,
        loginTime: new Date(),
      })
    )

    router.push('/account-verification?email=' + encodeURIComponent(formData.email))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4 sm:p-6">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-20 right-20 w-80 h-80 bg-primary/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-40 left-20 w-80 h-80 bg-secondary/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-[440px] animate-in fade-in slide-in-from-bottom-4 duration-500">
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

        {/* Progress */}
        <div className="flex gap-2 mb-6">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                s <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <Card className="border-border/60 shadow-xl shadow-black/5 dark:shadow-none bg-card/95 backdrop-blur-sm overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-primary via-secondary to-primary" />
          <CardHeader className="space-y-1.5 pb-4">
            <CardTitle className="text-2xl font-semibold tracking-tight">Create Account</CardTitle>
            <CardDescription>
              {step === 1 ? 'Enter your details and choose your role' : 'Set your password and accept terms'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {error && (
              <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive font-medium">
                {error}
              </div>
            )}

            {/* Step 1: Full name, Email, Role */}
            {step === 1 && (
              <form onSubmit={handleStep1} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
                  <div className="relative group">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="fullName"
                      name="fullName"
                      placeholder="e.g. John Doe"
                      value={formData.fullName}
                      onChange={handleChange}
                      className="pl-10 h-11 rounded-lg border-border/80 focus-visible:ring-2"
                      required
                      maxLength={80}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@gmail.com or you@yahoo.com"
                      value={formData.email}
                      onChange={handleChange}
                      className="pl-10 h-11 rounded-lg border-border/80 focus-visible:ring-2"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Account Role</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {ROLES.map((r) => (
                      <Button
                        key={r.value}
                        type="button"
                        variant={formData.role === r.value ? 'default' : 'outline'}
                        size="sm"
                        className="h-11 rounded-lg gap-1.5 text-xs font-medium"
                        onClick={() => setFormData((prev) => ({ ...prev, role: r.value }))}
                      >
                        {r.icon}
                        <span className="truncate">{r.label.split(' ')[0]}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <Button type="submit" className="w-full h-11 gap-2 rounded-lg font-medium shadow-sm">
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            )}

            {/* Step 2: Password, Confirm, Terms */}
            {step === 2 && (
              <form onSubmit={handleStep2} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={handleChange}
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

                <div className="space-y-3 p-4 rounded-lg bg-muted/50 border border-border">
                  <p className="text-sm font-semibold">Terms & Conditions</p>
                  <div className="text-xs text-muted-foreground space-y-2 max-h-28 overflow-y-auto">
                    <p>
                      By creating an account, you agree to BioTrack&apos;s Terms of Service and Privacy Policy. You consent to the collection and processing of your health data for monitoring, insights, and care.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="termsAccepted"
                      checked={formData.termsAccepted}
                      onCheckedChange={(checked: boolean | 'indeterminate') =>
                        setFormData((prev) => ({ ...prev, termsAccepted: checked === true }))
                      }
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <Label htmlFor="termsAccepted" className="text-sm cursor-pointer font-medium">
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

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1 h-11 rounded-lg"
                  >
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
