'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Heart, Mail, Lock, User, ArrowRight, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

export default function RegisterPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    dateOfBirth: '',
    termsAccepted: false,
  })
  const [error, setError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.email || !formData.fullName) {
      setError('Please fill in all fields')
      return
    }

    if (!formData.email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    setStep(2)
  }

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.password || !formData.confirmPassword) {
      setError('Please enter password')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setStep(3)
  }

  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.dateOfBirth) {
      setError('Please select your date of birth')
      return
    }

    if (!formData.termsAccepted) {
      setError('You must accept the terms and conditions')
      return
    }

    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Store new patient account
    localStorage.setItem('userSession', JSON.stringify({
      email: formData.email,
      name: formData.fullName,
      role: 'patient',
      loginTime: new Date(),
    }))

    router.push('/account-verification?email=' + encodeURIComponent(formData.email))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-20 right-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-40 left-20 w-72 h-72 bg-accent/20 rounded-full blur-3xl opacity-50" />
      </div>

      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center shadow-lg">
              <Heart className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                BioTrack
              </h1>
              <p className="text-xs text-muted-foreground">Healthcare Platform</p>
            </div>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full transition-colors ${
                s <= step ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Register Card */}
        <Card className="glass glow-green border-border/50 backdrop-blur-sm">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">Create Account</CardTitle>
            <CardDescription>
              {step === 1
                ? 'Enter your basic information'
                : step === 2
                  ? 'Set up your password'
                  : 'Complete your profile'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Step 1: Basic Info */}
            {step === 1 && (
              <form onSubmit={handleStep1} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="fullName"
                      name="fullName"
                      placeholder="John Doe"
                      value={formData.fullName}
                      onChange={handleChange}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={handleChange}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full gap-2">
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            )}

            {/* Step 2: Password */}
            {step === 2 && (
              <form onSubmit={handleStep2} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      className="pl-10"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    At least 6 characters, mix of uppercase and lowercase recommended
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                    Back
                  </Button>
                  <Button type="submit" className="flex-1 gap-2">
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            )}

            {/* Step 3: Profile & Terms */}
            {step === 3 && (
              <form onSubmit={handleStep3} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    name="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-3 p-4 bg-muted/50 rounded-lg border border-border">
                  <p className="text-sm font-semibold">Terms & Conditions</p>
                  <div className="text-xs text-muted-foreground space-y-2 max-h-32 overflow-y-auto">
                    <p>
                      By creating an account, you agree to BioTrack's Terms of Service and Privacy Policy. You
                      consent to the collection and processing of your health data for the purposes of:
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Monitoring and tracking vital signs</li>
                      <li>Providing health insights and recommendations</li>
                      <li>Improving healthcare provider care</li>
                      <li>Research and analytics (anonymized)</li>
                    </ul>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="termsAccepted"
                      name="termsAccepted"
                      checked={formData.termsAccepted}
                      onCheckedChange={(checked: boolean | 'indeterminate') =>
                        setFormData((prev) => ({
                          ...prev,
                          termsAccepted: checked === true,
                        }))
                      }
                    />
                    <Label htmlFor="termsAccepted" className="text-sm cursor-pointer">
                      I accept the terms and conditions
                    </Label>
                    <div className="ml-auto text-xs text-muted-foreground">
                      <button
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent('openPolicy', { detail: { mode: 'terms' } }))}
                        className="underline mr-2"
                      >
                        View Terms
                      </button>
                      <button
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent('openPolicy', { detail: { mode: 'privacy' } }))}
                        className="underline"
                      >
                        Privacy Policy
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                    Back
                  </Button>
                  <Button type="submit" disabled={isLoading} className="flex-1 gap-2">
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            )}

            {/* Login Link */}
            <p className="text-center text-sm text-muted-foreground mt-6">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-muted-foreground">
          <p>© 2026 BioTrack. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
