'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, CheckCircle, Heart, Mail, Shield } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  sendPatientVerificationCode,
  verifyPatientRegistrationCode,
  type VerificationMethod,
} from '@/lib/auth'

function maskContactNumber(contactNumber: string) {
  const digits = String(contactNumber ?? '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length <= 4) return '*'.repeat(digits.length)
  return `${'*'.repeat(digits.length - 4)}${digits.slice(-4)}`
}

const METHOD_LABEL: Record<VerificationMethod, string> = {
  email: 'email',
  sms: 'SMS',
}

export default function AccountVerificationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const patientId = searchParams.get('patientId') ?? ''
  const email = searchParams.get('email') ?? ''
  const contactNumber = searchParams.get('contactNumber') ?? ''

  const [method, setMethod] = useState<VerificationMethod>('email')
  const [step, setStep] = useState<'method' | 'verify' | 'complete'>('method')
  const [isLoading, setIsLoading] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [emailRecipient, setEmailRecipient] = useState(email)
  const [smsRecipient, setSmsRecipient] = useState(maskContactNumber(contactNumber))

  const missingSession = useMemo(() => !patientId, [patientId])

  const requestCode = async (selectedMethod: VerificationMethod, moveToVerifyStep = true) => {
    if (!patientId) {
      setError('Missing verification session. Please register again.')
      return
    }

    setError('')
    setSuccess('')
    setMethod(selectedMethod)
    setIsLoading(true)

    const result = await sendPatientVerificationCode(patientId, selectedMethod)
    setIsLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    if (moveToVerifyStep) {
      setStep('verify')
    }

    const recipientMasked = result.data?.recipientMasked ?? ''
    if (selectedMethod === 'email' && recipientMasked) setEmailRecipient(recipientMasked)
    if (selectedMethod === 'sms' && recipientMasked) setSmsRecipient(recipientMasked)

    const successParts = [
      result.data?.message ?? `Verification code sent via ${METHOD_LABEL[selectedMethod]}`,
    ]
    if (recipientMasked) successParts.push(`Recipient: ${recipientMasked}`)
    if (result.data?.devPreviewCode) successParts.push(`Dev code: ${result.data.devPreviewCode}`)
    setSuccess(successParts.join(' | '))
  }

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (missingSession) {
      setError('Missing verification session. Please register again.')
      return
    }

    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }

    setIsLoading(true)
    const result = await verifyPatientRegistrationCode(patientId, method, code)
    setIsLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setSuccess(result.message ?? 'Account verified successfully')
    setStep('complete')
  }

  const handleContinue = () => {
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center p-4">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-20 right-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-40 left-20 w-72 h-72 bg-accent/20 rounded-full blur-3xl opacity-50" />
      </div>

      <div className="w-full max-w-md">
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

        <Card className="glass glow-green border-border/50 backdrop-blur-sm">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">Verify Your Account</CardTitle>
            <CardDescription>
              {step === 'method'
                ? 'Choose how you want to receive your verification code'
                : step === 'verify'
                  ? `Enter the code sent to your ${METHOD_LABEL[method]}`
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
              <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-700">
                {success}
              </div>
            )}

            {missingSession ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Verification session is missing. Please register your patient account again.
                </p>
                <Button onClick={() => router.push('/register')} className="w-full">
                  Go to Register
                </Button>
              </div>
            ) : null}

            {!missingSession && step === 'method' && (
              <div className="space-y-3">
                <button
                  onClick={() => requestCode('email')}
                  disabled={isLoading}
                  className="w-full p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors text-left disabled:opacity-60"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <Mail className="h-5 w-5 text-primary mt-1" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">Email Verification</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Send code to {emailRecipient || email}
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => requestCode('sms')}
                  disabled={isLoading}
                  className="w-full p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors text-left disabled:opacity-60"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <Shield className="h-5 w-5 text-accent mt-1" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">SMS Verification</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Send code to {smsRecipient || maskContactNumber(contactNumber)}
                      </p>
                    </div>
                  </div>
                </button>

                <p className="text-xs text-muted-foreground text-center mt-4">
                  Use either Email or SMS to verify your patient account.
                </p>
              </div>
            )}

            {!missingSession && step === 'verify' && (
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
                    Enter the 6-digit code sent to your {METHOD_LABEL[method]}
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
                    disabled={isLoading}
                  >
                    Change Method
                  </Button>
                </div>

                <p className="text-center text-xs text-muted-foreground">
                  Did not receive a code?{' '}
                  <button
                    type="button"
                    onClick={() => requestCode(method, false)}
                    className="text-primary hover:underline"
                    disabled={isLoading}
                  >
                    Resend
                  </button>
                </p>
              </form>
            )}

            {!missingSession && step === 'complete' && (
              <div className="space-y-4 text-center">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="font-semibold">Account Verified Successfully</p>
                  <p className="text-sm text-muted-foreground">
                    Your patient account is now ready. Continue to login.
                  </p>
                </div>

                <Button onClick={handleContinue} className="w-full gap-2">
                  Go to Login
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-xs text-muted-foreground space-y-2">
          <p>
            <button className="text-primary hover:underline">Security & Privacy</button>
          </p>
          <p>&copy; 2026 BioTrack. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}

