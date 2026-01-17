"use client"

import type React from "react"

import { useState } from "react"
import { Heart, Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [selectedRole, setSelectedRole] = useState<"admin" | "health-worker" | "researcher" | null>(null)
  const [loginSuccess, setLoginSuccess] = useState(false)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRole) {
      alert("Please select a role to continue")
      return
    }
    setLoginSuccess(true)
    setTimeout(() => {
      // Handle navigation based on role
      console.log(`[v0] Logging in as ${selectedRole} with email ${email}`)
    }, 2000)
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
          {!loginSuccess ? (
            <>
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
                      required
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
                      required
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

                <div className="space-y-3 pt-2">
                  <p className="text-sm font-medium text-foreground">Select your role:</p>
                  <div className="flex gap-2">
                    {[
                      { id: "admin", label: "Admin", description: "System administrator" },
                      { id: "health-worker", label: "Health Worker", description: "Clinical staff" },
                      { id: "researcher", label: "Researcher", description: "Data analysis" },
                    ].map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        onClick={() => setSelectedRole(role.id as typeof selectedRole)}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          selectedRole === role.id
                            ? "bg-primary text-white shadow-lg shadow-primary/30"
                            : "glass-sm border-white/10 bg-white/10 text-foreground hover:bg-white/20"
                        }`}
                      >
                        <div className="text-xs">{role.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white font-semibold py-2 rounded-lg flex items-center justify-center gap-2 group"
                >
                  Sign In
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </form>
            </>
          ) : (
            <>
              <div className="space-y-4 text-center py-8">
                <CheckCircle className="h-16 w-16 text-primary mx-auto animate-bounce" />
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-foreground">
                    Welcome, {selectedRole?.replace("-", " ").charAt(0).toUpperCase() + selectedRole?.substring(1)}!
                  </h2>
                  <p className="text-muted-foreground">Redirecting to your dashboard...</p>
                </div>
              </div>
            </>
          )}

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground">
            Demo credentials: admin@biotrack.com | health.worker@clinic.com | researcher@study.com
          </p>
        </div>
      </div>
    </div>
  )
}
