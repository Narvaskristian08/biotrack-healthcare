"use client"

import type React from "react"

import { useState } from "react"
import { Heart, Mail, ArrowLeft, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 overflow-hidden relative">
      {/* Background gradient */}
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
            <h1 className="text-3xl font-bold text-foreground">Reset Password</h1>
            <p className="text-muted-foreground">Enter your email to receive reset instructions</p>
          </div>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@clinic.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 glass-sm border-white/10 bg-white/10"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold py-2 rounded-lg"
              >
                Send Reset Link
              </Button>
            </form>
          ) : (
            <div className="space-y-4 text-center py-4">
              <CheckCircle className="h-16 w-16 text-primary mx-auto" />
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">Check Your Email</h2>
                <p className="text-muted-foreground">We've sent a password reset link to {email}</p>
              </div>
            </div>
          )}

          <Link
            href="/login"
            className="flex items-center justify-center gap-2 text-primary hover:text-accent transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}
