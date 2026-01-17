"use client"

import type React from "react"

import { useState } from "react"
import { Heart, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle login logic
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 -left-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl opacity-50 animate-pulse"></div>
        <div className="absolute bottom-0 -right-40 w-80 h-80 bg-secondary/20 rounded-full blur-3xl opacity-50 animate-pulse"></div>
      </div>

      <div className="relative z-10 w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center">
            <Heart className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            BioTrack
          </span>
        </div>

        {/* Glass Container */}
        <div className="glass-lg space-y-6 p-8">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold text-foreground">Welcome Back</h1>
            <p className="text-muted-foreground">Sign in to your healthcare dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="health.worker@clinic.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 glass-sm border-white/10 bg-white/10"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-foreground">
                  Password
                </Label>
                <Link href="/forgot-password" className="text-xs text-primary hover:text-accent transition-colors">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 glass-sm border-white/10 bg-white/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold py-2 rounded-lg flex items-center justify-center gap-2 group"
            >
              Sign In
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </form>

          {/* Role Selection */}
          <div className="space-y-2 pt-4">
            <p className="text-sm text-muted-foreground text-center">Login as:</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 glass-sm border-white/10 bg-transparent">
                Admin
              </Button>
              <Button variant="outline" className="flex-1 glass-sm border-white/10 bg-transparent">
                Health Worker
              </Button>
              <Button variant="outline" className="flex-1 glass-sm border-white/10 bg-transparent">
                Researcher
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground">
          Demo credentials available for testing. Contact admin for access.
        </p>
      </div>
    </div>
  )
}
