'use client'

import { useEffect, useState } from 'react'
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requestPatientPasswordReset, resetPatientPasswordWithCode } from '@/lib/auth'

const CODE_REGEX = /^\d{6}$/

type Step = 'email' | 'reset'

export default function ForgotPasswordModal({
  open,
  onOpenChange,
  initialEmail,
  onPasswordReset,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialEmail?: string
  onPasswordReset?: (email: string) => void
}) {
  const [step, setStep] = useState<Step>('email')
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  useEffect(() => {
    if (!open) return
    setStep('email')
    setIsLoading(false)
    setError('')
    setInfo('')
    setCode('')
    setPassword('')
    setConfirmPassword('')
    setShowPassword(false)
    setShowConfirmPassword(false)
    setEmail(String(initialEmail ?? '').trim())
  }, [open, initialEmail])

  const handleRequestCode = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setInfo('')

    const normalizedEmail = email.trim()
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    setIsLoading(true)
    const result = await requestPatientPasswordReset(normalizedEmail)
    setIsLoading(false)

    if (!result.success) {
      setError(result.error || 'Unable to send reset code')
      return
    }

    const backendMessage =
      result.data?.message ||
      'If an active patient account with that email exists, a reset code has been sent.'
    const devHint = result.data?.devPreviewCode ? ` Dev code: ${result.data.devPreviewCode}` : ''
    setInfo(`${backendMessage}${devHint}`)
    setStep('reset')
  }

  const handleResendCode = async () => {
    setError('')
    setInfo('')

    const normalizedEmail = email.trim()
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setError('Please enter a valid email address')
      setStep('email')
      return
    }

    setIsLoading(true)
    const result = await requestPatientPasswordReset(normalizedEmail)
    setIsLoading(false)

    if (!result.success) {
      setError(result.error || 'Unable to resend code')
      return
    }

    const backendMessage =
      result.data?.message ||
      'If an active patient account with that email exists, a reset code has been sent.'
    const devHint = result.data?.devPreviewCode ? ` Dev code: ${result.data.devPreviewCode}` : ''
    setInfo(`${backendMessage}${devHint}`)
  }

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setInfo('')

    const normalizedEmail = email.trim()
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setError('Please enter a valid email address')
      setStep('email')
      return
    }

    if (!CODE_REGEX.test(code.trim())) {
      setError('Please enter the 6-digit verification code')
      return
    }

    if (!password || !confirmPassword) {
      setError('Please enter and confirm your new password')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)
    const result = await resetPatientPasswordWithCode({
      email: normalizedEmail,
      code: code.trim(),
      newPassword: password,
    })
    setIsLoading(false)

    if (!result.success) {
      setError(result.error || 'Unable to reset password')
      return
    }

    onPasswordReset?.(normalizedEmail)
    onOpenChange(false)
  }

  const title = step === 'email' ? 'Reset password' : 'Set a new password'
  const description =
    step === 'email'
      ? 'We will send a 6-digit verification code to your email.'
      : 'Enter the code and choose a new password.'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md overflow-hidden rounded-2xl border border-[#c7e6d7] bg-white p-0 shadow-[0_30px_70px_rgba(8,35,25,0.24)]">
        <div className="border-b border-[#d9ede2] bg-linear-to-r from-[#effaf4] to-[#ffffff] px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <DialogTitle className="text-xl text-[#15392b]">{title}</DialogTitle>
              <DialogDescription className="text-sm text-[#5b786d]">{description}</DialogDescription>
            </div>
            <div className="rounded-full bg-[#e9f8f0] p-2.5 text-[#0f8f60]">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#e9f8f0] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#0f7a4e]">
            <Mail className="h-3.5 w-3.5" />
            Password Recovery
          </div>
        </div>

        <div className="max-h-[75vh] space-y-4 overflow-y-auto px-6 py-5">
          {error ? (
            <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          ) : null}

          {info ? (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {info}
            </div>
          ) : null}

          {step === 'email' ? (
            <form onSubmit={handleRequestCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email" className="text-sm font-semibold text-[#163428]">
                  Email address
                </Label>
                <div className="auth-input-shell relative rounded-xl">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6f8f83]" />
                  <Input
                    id="forgot-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    autoFocus
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@gmail.com or your@yahoo.com"
                    className="h-12 border-0 bg-transparent pl-11 text-[#163428] placeholder:text-[#93a79d] shadow-none focus-visible:ring-0"
                    disabled={isLoading}
                    required
                  />
                </div>
                <p className="text-xs text-[#5b786d]">
                  For security, we can’t confirm whether an email is registered.
                </p>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="h-[3.15rem] w-full rounded-xl bg-[#0f8f60] text-base font-medium text-white shadow-md shadow-[#0f8f60]/30 transition-all hover:-translate-y-0.5 hover:bg-[#0c7a52]"
              >
                {isLoading ? 'Sending code...' : 'Send reset code'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="rounded-xl border border-[#bde7d2] bg-[#eef9f3] px-4 py-3 text-sm text-[#1f5c43]">
                Code sent to <span className="font-semibold">{email.trim() || 'your email'}</span>. Enter it below to
                set a new password.
              </div>

              <div className="space-y-2">
                <Label htmlFor="forgot-code" className="text-sm font-semibold text-[#163428]">
                  Verification code
                </Label>
                <Input
                  id="forgot-code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="h-12 rounded-xl border-[#cfe5d9] bg-white text-center text-lg tracking-[0.35em] text-[#163428]"
                  disabled={isLoading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="forgot-password" className="text-sm font-semibold text-[#163428]">
                  New password
                </Label>
                <div className="auth-input-shell relative rounded-xl">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6f8f83]" />
                  <Input
                    id="forgot-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********"
                    className="h-12 border-0 bg-transparent pl-11 pr-12 text-[#163428] placeholder:text-[#93a79d] shadow-none focus-visible:ring-0"
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-[#628175] transition-colors hover:text-[#173328]"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="forgot-confirm-password" className="text-sm font-semibold text-[#163428]">
                  Confirm password
                </Label>
                <div className="auth-input-shell relative rounded-xl">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6f8f83]" />
                  <Input
                    id="forgot-confirm-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="********"
                    className="h-12 border-0 bg-transparent pl-11 pr-12 text-[#163428] placeholder:text-[#93a79d] shadow-none focus-visible:ring-0"
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-[#628175] transition-colors hover:text-[#173328]"
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep('email')
                    setError('')
                    setInfo('')
                    setCode('')
                    setPassword('')
                    setConfirmPassword('')
                  }}
                  disabled={isLoading}
                  className="text-sm font-medium text-[#0f8f60] underline-offset-4 hover:underline"
                >
                  Change email
                </button>
                <button
                  type="button"
                  onClick={() => void handleResendCode()}
                  disabled={isLoading}
                  className="text-sm font-medium text-[#0f8f60] underline-offset-4 hover:underline"
                >
                  Resend code
                </button>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="h-[3.15rem] w-full rounded-xl bg-[#0f8f60] text-base font-medium text-white shadow-md shadow-[#0f8f60]/30 transition-all hover:-translate-y-0.5 hover:bg-[#0c7a52]"
              >
                {isLoading ? 'Resetting...' : 'Reset password'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

