'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Activity,
  ArrowRight,
  Eye,
  EyeOff,
  Heart,
  Lock,
  Mail,
  ShieldCheck,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginWithDetectedRole, type PatientLoginMfaChallenge, verifyPatientLoginMfa } from '@/lib/auth'

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()\-_=+[\]{}|;:,.<>])[A-Za-z\d@$!%*?&#^()\-_=+[\]{}|;:,.<>]{8,}$/
const OTP_REGEX = /^\d{6}$/

function LoginHeroPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-gradient-to-br from-[#33c481] via-[#1fae6e] to-[#0f7a4e] lg:flex lg:items-center lg:justify-center lg:p-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_12%,rgba(255,255,255,0.26),transparent_36%),radial-gradient(circle_at_86%_86%,rgba(255,255,255,0.14),transparent_46%)]" />
      <img
        src="/assets/sdg/sdg-wheel-official.svg"
        alt="Official UN SDG wheel"
        className="pointer-events-none absolute -right-28 top-10 h-[26rem] w-[26rem] opacity-20 auth-wheel-spin"
      />

      <div className="relative z-10 w-full max-w-[560px] auth-enter-right">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-white/90 backdrop-blur-sm">
          <ShieldCheck className="h-3.5 w-3.5" />
          Official Health Goal Artwork
        </div>

        <div className="grid grid-cols-[auto_1fr] gap-6 rounded-3xl border border-white/35 bg-[#0b3a2a]/80 p-6 shadow-[0_24px_54px_rgba(8,35,25,0.45)] backdrop-blur-md auth-soft-glow">
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
              BioTrack enables safer access to patient health data, monitoring, and verified care workflows.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-white/85">
              <div className="rounded-xl border border-white/30 bg-white/10 px-3 py-2">Secure Login</div>
              <div className="rounded-xl border border-white/30 bg-white/10 px-3 py-2">Health Monitoring</div>
              <div className="rounded-xl border border-white/30 bg-white/10 px-3 py-2">MFA + OTP</div>
              <div className="rounded-xl border border-white/30 bg-white/10 px-3 py-2">Continuity of Care</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [mfaChallenge, setMfaChallenge] = useState<PatientLoginMfaChallenge | null>(null)
  const [mfaCode, setMfaCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (mfaChallenge) {
      if (!OTP_REGEX.test(mfaCode.trim())) {
        setError('Enter the 6-digit verification code')
        return
      }

      setIsLoading(true)
      const verifyResult = await verifyPatientLoginMfa({
        patientId: mfaChallenge.patientId,
        challengeId: mfaChallenge.challengeId,
        code: mfaCode.trim(),
      })
      setIsLoading(false)

      if (verifyResult.error) {
        setError(verifyResult.error)
        return
      }

      setSuccess('Login successful. Redirecting...')
      router.replace('/')
      return
    }

    if (!formData.email.trim()) {
      setError('Please enter your email address')
      return
    }

    if (!formData.password) {
      setError('Please enter your password')
      return
    }

    if (!PASSWORD_REGEX.test(formData.password)) {
      setError('Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character')
      return
    }

    setIsLoading(true)

    const result = await loginWithDetectedRole({
      email: formData.email.trim(),
      password: formData.password,
    })

    setIsLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    if (result.mfaRequired && result.mfaChallenge) {
      setMfaChallenge(result.mfaChallenge)
      setMfaCode('')
      const devCodeHint = result.mfaChallenge.devPreviewCode
        ? ` Dev code: ${result.mfaChallenge.devPreviewCode}`
        : ''
      setSuccess(`Verification code sent via ${result.mfaChallenge.method} to ${result.mfaChallenge.recipientMasked || 'your account'}.${devCodeHint}`)
      return
    }

    if (!rememberMe) {
      // Session persistence behavior is currently handled globally via localStorage.
      // This toggle is kept for UI parity with the requested template.
    }

    setSuccess('Login successful. Redirecting...')
    router.replace('/')
  }

  return (
    <div className="min-h-screen bg-[#eef8f2]">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="flex items-center justify-center px-6 py-10 sm:px-10 lg:px-16 xl:px-24">
          <div className="w-full max-w-[460px] auth-enter-left">
            <Link href="/" className="mb-8 inline-flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#12935f] to-[#33c481] text-white shadow-lg shadow-[#12935f]/35">
                <Heart className="h-6 w-6" />
              </span>
              <span className="text-[2rem] font-semibold tracking-tight text-[#111f1a]">BioTrack</span>
            </Link>

            <div className="auth-panel rounded-3xl p-7 sm:p-8">
              <div className="auth-enter-left" style={{ animationDelay: '40ms' }}>
                <div className="inline-flex items-center gap-2 rounded-full bg-[#e9f8f0] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#0f7a4e]">
                  <Activity className="h-3.5 w-3.5" />
                  Health Access
                </div>
                <h1 className="mt-4 text-[2.3rem] font-semibold leading-tight text-[#111f1a]">Welcome back</h1>
                <p className="mt-1.5 text-[1rem] text-[#4e6b5d]">Sign in to access your healthcare dashboard.</p>
              </div>

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

                <form onSubmit={handleSubmit} className="mt-6 space-y-5 auth-enter-left" style={{ animationDelay: '110ms' }}>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-semibold text-[#163428]">Email address</Label>
                    <div className="auth-input-shell relative rounded-xl">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6f8f83]" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="your@gmail.com or your@yahoo.com"
                        className="h-12 border-0 bg-transparent pl-11 text-[#163428] placeholder:text-[#93a79d] shadow-none focus-visible:ring-0"
                        disabled={Boolean(mfaChallenge)}
                        required
                      />
                    </div>
                  </div>

                  {!mfaChallenge ? (
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-sm font-semibold text-[#163428]">Password</Label>
                        <div className="auth-input-shell relative rounded-xl">
                          <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6f8f83]" />
                          <Input
                            id="password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="********"
                            className="h-12 border-0 bg-transparent pl-11 pr-12 text-[#163428] placeholder:text-[#93a79d] shadow-none focus-visible:ring-0"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-[#628175] transition-colors hover:text-[#173328]"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 text-sm">
                        <label className="inline-flex items-center gap-2.5 text-[#1f3c30]">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="h-4 w-4 rounded border-[#aacfc0] text-[#12935f] focus:ring-[#12935f]/30"
                          />
                          Remember for 30 days
                        </label>
                        <Link href="/forgot-password" className="font-medium text-[#0f8f60] underline-offset-4 hover:underline">
                          Forgot password
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-[#bde7d2] bg-[#eef9f3] px-4 py-3 text-sm text-[#1f5c43]">
                        Enter the 6-digit code sent to {mfaChallenge.recipientMasked || 'your account'}.
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mfaCode" className="text-sm font-semibold text-[#163428]">Verification code</Label>
                        <Input
                          id="mfaCode"
                          name="mfaCode"
                          type="text"
                          inputMode="numeric"
                          value={mfaCode}
                          onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="123456"
                          className="h-12 rounded-xl border-[#cfe5d9] bg-white text-center text-lg tracking-[0.35em] text-[#163428]"
                          required
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setMfaChallenge(null)
                          setMfaCode('')
                          setSuccess('')
                          setError('')
                        }}
                        className="text-sm font-medium text-[#0f8f60] underline-offset-4 hover:underline"
                      >
                        Use a different account
                      </button>
                    </div>
                  )}

                 <Button
                   type="submit"
                   disabled={isLoading}
                   className="h-[3.15rem] w-full rounded-xl bg-[#0f8f60] text-base font-medium text-white shadow-md shadow-[#0f8f60]/30 transition-all hover:-translate-y-0.5 hover:bg-[#0c7a52]"
                 >
                   {isLoading ? (mfaChallenge ? 'Verifying...' : 'Signing in...') : (mfaChallenge ? 'Verify code' : 'Sign in')}
                   <ArrowRight className="ml-2 h-4 w-4" />
                 </Button>
               </form>

              <div className="my-7 flex items-center gap-4">
                <div className="h-px flex-1 bg-[#cfe5d9]" />
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6f8f83]">Or continue with</span>
                <div className="h-px flex-1 bg-[#cfe5d9]" />
              </div>

              <div className="grid grid-cols-2 gap-3 auth-enter-left" style={{ animationDelay: '160ms' }}>
                <Button type="button" variant="outline" disabled className="h-12 rounded-xl border-[#cfe5d9] bg-white text-[#1f3c30] hover:bg-white">
                  Google
                </Button>
                <Button type="button" variant="outline" disabled className="h-12 rounded-xl border-[#cfe5d9] bg-white text-[#1f3c30] hover:bg-white">
                  Apple
                </Button>
              </div>

              <p className="mt-7 text-center text-sm text-[#57756a]">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="font-semibold text-[#0f8f60] underline-offset-4 hover:underline">
                  Sign up
                </Link>
              </p>

              <p className="mt-4 text-center text-xs text-[#6b8579]">
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
            </div>

            <p className="mt-6 text-center text-xs text-[#7f998f]">Copyright 2026 BioTrack. All rights reserved.</p>
          </div>
        </section>

        <LoginHeroPanel />
      </div>
    </div>
  )
}
