'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Heart, Mail, Shield, CheckCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

export default function AccountVerificationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [method, setMethod] = useState<'email' | 'otp'>('email')
  const [step, setStep] = useState<'method' | 'verify' | 'complete'>('method')
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSelectMethod = (selectedMethod: 'email' | 'otp') => {
    setMethod(selectedMethod)
    setStep('verify')
    setSuccess(`Verification code sent via ${selectedMethod === 'email' ? 'email' : 'SMS'}`)
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }

    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsLoading(false)

    // Demo: any 6-digit code works
    setStep('complete')
  }

  const handleContinue = () => {
    router.push('/')
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

        {/* Verification Card */}
        <Card className="glass glow-green border-border/50 backdrop-blur-sm">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">Verify Your Account</CardTitle>
            <CardDescription>
              {step === 'method'
                ? 'Choose how you want to verify your account'
                : step === 'verify'
                  ? `Enter the code sent to your ${method}`
                  : 'Your account is verified'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-600">
                {success}
              </div>
            )}

            {/* Step 1: Select Verification Method */}
            {step === 'method' && (
              <div className="space-y-3">
                {/* Email Verification */}
                <button
                  onClick={() => handleSelectMethod('email')}
                  className="w-full p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <Mail className="h-5 w-5 text-primary mt-1" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">Email Verification</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Receive a verification code at {email}
                      </p>
                    </div>
                  </div>
                </button>

                {/* OTP Verification */}
                <button
                  onClick={() => handleSelectMethod('otp')}
                  className="w-full p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <Shield className="h-5 w-5 text-accent mt-1" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">SMS/OTP Verification</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Receive a one-time password via SMS
                      </p>
                    </div>
                  </div>
                </button>

                <p className="text-xs text-muted-foreground text-center mt-4">
                  We take security seriously. Choose your preferred verification method above.
                </p>
              </div>
            )}

            {/* Step 2: Enter Verification Code */}
            {step === 'verify' && (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Verification Code</Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="000000"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    className="text-center text-3xl tracking-widest font-mono"
                    required
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Enter the 6-digit code sent to your {method}
                  </p>
                </div>

                <div className="space-y-3">
                  <Button type="submit" disabled={isLoading} className="w-full gap-2">
                    {isLoading ? 'Verifying...' : 'Verify Code'}
                    <CheckCircle className="h-4 w-4" />
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('method')}
                    className="w-full"
                  >
                    Change Method
                  </Button>
                </div>

                <p className="text-center text-xs text-muted-foreground">
                  Didn't receive the code?{' '}
                  <button
                    type="button"
                    onClick={() => handleSelectMethod(method)}
                    className="text-primary hover:underline"
                  >
                    Resend
                  </button>
                </p>
              </form>
            )}

            {/* Step 3: Verification Complete */}
            {step === 'complete' && (
              <div className="space-y-4 text-center">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="font-semibold">Account Verified Successfully!</p>
                  <p className="text-sm text-muted-foreground">
                    Your account is now fully verified and ready to use.
                  </p>
                </div>

                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-muted-foreground space-y-2">
                  <p className="font-semibold">Next Steps:</p>
                  <ul className="space-y-1 text-left">
                    <li>✓ Set up your health profile</li>
                    <li>✓ Connect health devices</li>
                    <li>✓ Enable notifications</li>
                    <li>✓ Start tracking your vitals</li>
                  </ul>
                </div>

                <Button onClick={handleContinue} className="w-full gap-2">
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-muted-foreground space-y-2">
          <p>
            <button className="text-primary hover:underline">Security & Privacy</button>
          </p>
          <p>© 2026 BioTrack. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
