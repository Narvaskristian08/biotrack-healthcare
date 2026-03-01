'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowRight,
  Check,
  CheckCircle,
  Globe,
  Headphones,
  Heart,
  Laptop,
  Mail,
  MessageSquare,
  Phone,
  Shield,
  Smartphone,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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

const CODE_LENGTH = 6

function VerificationHeroPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-gradient-to-br from-[#33c481] via-[#1fae6e] to-[#0f7a4e] lg:flex lg:items-center lg:justify-center lg:p-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_12%,rgba(255,255,255,0.28),transparent_35%),radial-gradient(circle_at_80%_85%,rgba(255,255,255,0.18),transparent_42%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_58%)]" />

      <div className="relative z-10 w-full max-w-[560px]">
        <div className="mb-12 grid grid-cols-5 gap-4 text-white/55">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/35 bg-white/10 backdrop-blur-sm">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/35 bg-white/10 backdrop-blur-sm">
            <Headphones className="h-5 w-5" />
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/35 bg-white/10 backdrop-blur-sm">
            <Phone className="h-5 w-5" />
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/35 bg-white/10 backdrop-blur-sm">
            <Globe className="h-5 w-5" />
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/35 bg-white/10 backdrop-blur-sm">
            <Laptop className="h-5 w-5" />
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[470px]">
          <div className="relative overflow-hidden rounded-[2.4rem] border border-white/45 bg-[#0b3a2a] px-8 pb-10 pt-12 shadow-[0_30px_60px_rgba(15,8,36,0.45)]">
            <div className="pointer-events-none absolute -left-8 top-24 flex h-24 w-24 items-center justify-center rounded-full border-2 border-white/55 bg-white/15 backdrop-blur-sm">
              <Check className="h-11 w-11 text-white" />
            </div>

            <div className="mx-auto mt-8 flex h-28 w-28 items-center justify-center rounded-full bg-[#ecfff4]">
              <Shield className="h-14 w-14 text-[#138c5a]" />
            </div>

            <div className="mx-auto mt-8 max-w-[300px] rounded-2xl bg-[#0f7a4e] p-5 text-center text-white/90">
              <p className="text-sm uppercase tracking-[0.15em] text-white/70">MFA Security</p>
              <p className="mt-2 text-lg font-semibold">Your account stays protected with OTP verification</p>
            </div>
          </div>

          <div className="mx-auto mt-4 h-4 w-56 rounded-full bg-white/45" />
          <div className="mx-auto mt-3 h-[3px] w-72 rounded-full bg-white/70" />
        </div>
      </div>
    </aside>
  )
}

export default function AccountVerificationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const codeInputRef = useRef<HTMLInputElement | null>(null)

  const patientId = searchParams.get('patientId') ?? ''
  const email = searchParams.get('email') ?? ''
  const contactNumber = searchParams.get('contactNumber') ?? ''
  const healthCenterName = searchParams.get('healthCenterName') ?? ''
  const healthCenterLocation = searchParams.get('healthCenterLocation') ?? ''

  const [method, setMethod] = useState<VerificationMethod>('email')
  const [step, setStep] = useState<'method' | 'verify' | 'complete'>('method')
  const [isLoading, setIsLoading] = useState(false)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [emailRecipient, setEmailRecipient] = useState(email)
  const [smsRecipient, setSmsRecipient] = useState(maskContactNumber(contactNumber))

  const missingSession = useMemo(() => !patientId, [patientId])
  const currentStep = step === 'method' ? 0 : step === 'verify' ? 1 : 2
  const codeSlots = Array.from({ length: CODE_LENGTH }, (_, idx) => code[idx] ?? '')

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
      setTimeout(() => codeInputRef.current?.focus(), 0)
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

    if (!code || code.length !== CODE_LENGTH) {
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

  const handleCodeChange = (value: string) => {
    const numericValue = value.replace(/\D/g, '').slice(0, CODE_LENGTH)
    setCode(numericValue)
  }

  return (
    <div className="min-h-screen bg-[#eef8f2]">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-16 xl:px-20">
          <div className="w-full max-w-[520px]">
            <Link href="/" className="mb-10 inline-flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#12935f] to-[#33c481] text-white shadow-lg shadow-[#12935f]/35">
                <Heart className="h-6 w-6" />
              </span>
              <span className="text-[2rem] font-semibold tracking-tight text-[#111f1a]">BioTrack</span>
            </Link>

            <h1 className="text-[2.3rem] font-semibold leading-tight text-[#111f1a]">Google MFA Verification</h1>
            <p className="mt-2 text-[1.0625rem] text-[#4e6b5d]">Secure your new patient account with one-time password verification.</p>

            <div className="mt-6 flex items-center gap-2.5 rounded-xl border border-[#cbeedd] bg-[#ecfff4] p-3">
              {['Choose method', 'Enter OTP', 'Done'].map((label, idx) => {
                const active = idx <= currentStep
                return (
                  <div key={label} className="flex min-w-0 flex-1 items-center gap-2">
                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${active ? 'bg-[#15a86b] text-white' : 'bg-[#d8efe2] text-[#567368]'}`}>
                      {idx + 1}
                    </div>
                    <span className={`truncate text-xs font-medium ${active ? 'text-[#0f7a4e]' : 'text-[#5d7b70]'}`}>{label}</span>
                  </div>
                )
              })}
            </div>

            {healthCenterName || healthCenterLocation ? (
              <div className="mt-4 rounded-xl border border-[#d4e8dd] bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#5b786d]">Selected healthcare location</p>
                <p className="mt-1 text-sm font-semibold text-[#163428]">{healthCenterName || 'Healthcare Provider'}</p>
                {healthCenterLocation ? <p className="mt-1 text-xs text-[#5d7b70]">{healthCenterLocation}</p> : null}
              </div>
            ) : null}

            {error ? (
              <div className="mt-5 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            ) : null}

            {success ? (
              <div className="mt-5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                {success}
              </div>
            ) : null}

            {missingSession ? (
              <Card className="mt-6 border-[#d4e8dd] bg-white shadow-sm">
                <CardContent className="space-y-4 p-6">
                  <p className="text-sm text-[#5a766c]">Verification session is missing. Please register your patient account again.</p>
                  <Button
                    onClick={() => router.push('/register')}
                    className="h-[3rem] w-full rounded-xl bg-[#0f8f60] text-white hover:bg-[#0c7a52]"
                  >
                    Go to Register
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            {!missingSession && step === 'method' ? (
              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={() => requestCode('email')}
                  disabled={isLoading}
                  className="w-full rounded-xl border border-[#cbeedd] bg-white p-4 text-left transition-colors hover:bg-[#f6fff9] disabled:opacity-60"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e8f9ef] text-[#15a86b]">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#163428]">Email Verification</p>
                      <p className="mt-1 truncate text-xs text-[#4e6b5d]">Send code to {emailRecipient || email || 'your email address'}</p>
                      {isLoading && method === 'email' ? (
                        <p className="mt-1 text-xs font-medium text-[#0f8f60]">Sending code...</p>
                      ) : null}
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => requestCode('sms')}
                  disabled={isLoading}
                  className="w-full rounded-xl border border-[#cbeedd] bg-white p-4 text-left transition-colors hover:bg-[#f6fff9] disabled:opacity-60"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf9f3] text-[#1f8f64]">
                      <Smartphone className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#163428]">SMS Verification</p>
                      <p className="mt-1 truncate text-xs text-[#4e6b5d]">Send code to {smsRecipient || maskContactNumber(contactNumber) || 'your mobile number'}</p>
                      {isLoading && method === 'sms' ? (
                        <p className="mt-1 text-xs font-medium text-[#0f8f60]">Sending code...</p>
                      ) : null}
                    </div>
                  </div>
                </button>

                <p className="pt-1 text-center text-xs text-[#5f7d72]">Use either Email or SMS to verify your patient account.</p>
              </div>
            ) : null}

            {!missingSession && step === 'verify' ? (
              <form onSubmit={handleVerifyCode} className="mt-6 space-y-5">
                <div className="flex items-center gap-2 rounded-xl border border-[#cbeedd] bg-white px-4 py-2.5 text-sm text-[#5d7b70]">
                  <Shield className="h-4 w-4 text-[#15a86b]" />
                  Enter the 6-digit code sent to your {METHOD_LABEL[method]}.
                </div>

                <input
                  ref={codeInputRef}
                  id="code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={CODE_LENGTH}
                  value={code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  className="sr-only"
                />

                <button
                  type="button"
                  onClick={() => codeInputRef.current?.focus()}
                  className="flex w-full items-center justify-between gap-2"
                >
                  {codeSlots.map((digit, idx) => {
                    const filled = Boolean(digit)
                    const active = idx === code.length && code.length < CODE_LENGTH
                    return (
                      <span
                        key={idx}
                        className={`flex h-14 w-12 items-center justify-center rounded-xl border text-xl font-semibold transition-colors ${filled ? 'border-[#14a66a] bg-[#f1fdf6] text-[#0f7a4e]' : active ? 'border-[#14a66a] bg-white text-[#0f7a4e]' : 'border-[#cfe5d9] bg-white text-[#8aa398]'}`}
                      >
                        {digit || '-'}
                      </span>
                    )
                  })}
                </button>

                <div className="space-y-3">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="h-[3.1rem] w-full rounded-xl bg-[#0f8f60] text-base font-medium text-white shadow-md shadow-[#0f8f60]/30 transition-colors hover:bg-[#0c7a52]"
                  >
                    {isLoading ? 'Verifying...' : 'Verify Code'}
                    <CheckCircle className="ml-2 h-4 w-4" />
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('method')}
                    disabled={isLoading}
                    className="h-[3rem] w-full rounded-xl border-[#cfe5d9] bg-white text-[#1f3c30] hover:bg-white"
                  >
                    Change Method
                  </Button>
                </div>

                <p className="text-center text-xs text-[#5f7d72]">
                  Didn&apos;t receive a code?{' '}
                  <button
                    type="button"
                    onClick={() => requestCode(method, false)}
                    className="font-medium text-[#0f8f60] underline-offset-4 hover:underline"
                    disabled={isLoading}
                  >
                    Resend
                  </button>
                </p>
              </form>
            ) : null}

            {!missingSession && step === 'complete' ? (
              <div className="mt-6 space-y-5 rounded-2xl border border-[#d9f0df] bg-white p-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle className="h-8 w-8 text-emerald-600" />
                </div>

                <div>
                  <p className="text-lg font-semibold text-[#163428]">Account Verified Successfully</p>
                  <p className="mt-1 text-sm text-[#517065]">Your patient account is now secure and ready for login.</p>
                </div>

                <Button
                  onClick={handleContinue}
                  className="h-[3.1rem] w-full rounded-xl bg-[#0f8f60] text-base font-medium text-white shadow-md shadow-[#0f8f60]/30 transition-colors hover:bg-[#0c7a52]"
                >
                  Go to Login
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ) : null}

            <p className="mt-6 text-center text-xs text-[#7f998f]">Copyright 2026 BioTrack. All rights reserved.</p>
          </div>
        </section>

        <VerificationHeroPanel />
      </div>
    </div>
  )
}

