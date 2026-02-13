'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Heart,
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  User,
  Building2,
  Shield,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  loginPatient,
  loginHealthCenter,
  loginAdmin,
  type AuthRole,
} from '@/lib/auth'

// Password REGEX: min 8 chars, at least 1 uppercase, 1 lowercase, 1 number, 1 special char
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()\-_=+[\]{}|;:,.<>])[A-Za-z\d@$!%*?&#^()\-_=+[\]{}|;:,.<>]{8,}$/

type LoginRole = 'patient' | 'provider' | 'admin'

const ROLES: { value: LoginRole; label: string; icon: React.ReactNode }[] = [
  { value: 'patient', label: 'Patient', icon: <User className="h-4 w-4" /> },
  { value: 'provider', label: 'Provider', icon: <Building2 className="h-4 w-4" /> },
  { value: 'admin', label: 'Admin', icon: <Shield className="h-4 w-4" /> },
]

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [selectedRole, setSelectedRole] = useState<LoginRole>('patient')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
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

    if (!formData.email.trim()) {
      setError('Please enter your email address')
      return
    }

    if (!formData.password) {
      setError('Please enter your password')
      return
    }

    if (!PASSWORD_REGEX.test(formData.password)) {
      setError(
        'Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number, and 1 special character'
      )
      return
    }

    setIsLoading(true)

    const loginData = {
      email: formData.email.trim(),
      password: formData.password,
    }

    let result: { session?: unknown; error?: string }

    // Call the appropriate login function based on selected role
    switch (selectedRole) {
      case 'patient':
        result = await loginPatient(loginData)
        break
      case 'provider':
        result = await loginHealthCenter(loginData)
        break
      case 'admin':
        result = await loginAdmin(loginData)
        break
      default:
        result = { error: 'Invalid role selected' }
    }

    setIsLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setSuccess('Login successful. Redirecting...')

    // Navigate to dashboard on success
    router.replace('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4 sm:p-6">
      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-20 right-20 w-80 h-80 bg-primary/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-40 left-20 w-80 h-80 bg-secondary/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-[420px] animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Logo Section */}
        <div className="text-center mb-8">
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

        {/* Login Card */}
        <Card className="border-border/60 shadow-xl shadow-black/5 dark:shadow-none bg-card/95 backdrop-blur-sm overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-primary via-secondary to-primary" />
          <CardHeader className="space-y-1.5 pb-4">
            <CardTitle className="text-2xl font-semibold tracking-tight">Welcome Back</CardTitle>
            <CardDescription className="text-muted-foreground">
              Sign in to your account to access your health dashboard
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            {error && (
              <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive font-medium">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3.5 rounded-lg bg-primary/10 border border-primary/20 text-sm text-primary font-medium">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Role Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Account Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map((r) => (
                    <Button
                      key={r.value}
                      type="button"
                      variant={selectedRole === r.value ? 'default' : 'outline'}
                      size="sm"
                      className="h-11 rounded-lg gap-1.5 text-xs font-medium"
                      onClick={() => setSelectedRole(r.value)}
                    >
                      {r.icon}
                      <span className="truncate">{r.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="your@gmail.com or your@yahoo.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-10 h-11 rounded-lg border-border/80 focus-visible:ring-2"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>
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

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 gap-2 rounded-lg font-medium shadow-sm"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-card px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Or</span>
              </div>
            </div>

            {/* Social Login Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <Button variant="outline" disabled className="h-11 rounded-lg">
                Google
              </Button>
              <Button variant="outline" disabled className="h-11 rounded-lg">
                Apple
              </Button>
            </div>

            {/* Register Link */}
            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-primary hover:underline font-semibold">
                Create account
              </Link>
            </p>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-muted-foreground space-y-2">
          <p>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('openPolicy', { detail: { mode: 'privacy' } }))}
              className="hover:underline hover:text-foreground transition-colors"
            >
              Privacy Policy
            </button>
            {' • '}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('openPolicy', { detail: { mode: 'terms' } }))}
              className="hover:underline hover:text-foreground transition-colors"
            >
              Terms of Service
            </button>
          </p>
          <p>© 2026 BioTrack. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
