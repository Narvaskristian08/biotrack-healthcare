'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Heart, Mail, Lock, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState('')

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
    setIsLoading(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Demo: Accept any credentials for testing
    if (formData.email && formData.password) {
      // Determine role based on email pattern (for demo)
      const role = formData.email.includes('provider')
        ? 'provider'
        : formData.email.includes('admin')
          ? 'admin'
          : 'patient'

      // Store session info
      localStorage.setItem('userSession', JSON.stringify({
        email: formData.email,
        role: role,
        loginTime: new Date(),
      }))

      router.push('/')
    } else {
      setError('Please enter both email and password')
      setIsLoading(false)
    }
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

        {/* Login Card */}
        <Card className="glass glow-green border-border/50 backdrop-blur-sm">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>
              Sign in to your account to access your health dashboard
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email or Username</Label>
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

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot?
                  </Link>
                </div>
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
              </div>

              {/* Demo Credentials Hint */}
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-muted-foreground">
                <p className="font-semibold mb-1">Demo Credentials:</p>
                <ul className="space-y-1">
                  <li>• Patient: patient@example.com</li>
                  <li>• Provider: provider@example.com</li>
                  <li>• Password: any password</li>
                </ul>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full gap-2"
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
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            {/* Social Login Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <Button variant="outline" disabled>
                Google
              </Button>
              <Button variant="outline" disabled>
                Apple
              </Button>
            </div>

            {/* Register Link */}
            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link href="/register" className="text-primary hover:underline font-medium">
                Create account
              </Link>
            </p>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-muted-foreground space-y-2">
          <p>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('openPolicy', { detail: { mode: 'privacy' } }))}
              className="hover:underline"
            >
              Privacy Policy
            </button>
            {' • '}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('openPolicy', { detail: { mode: 'terms' } }))}
              className="hover:underline"
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
