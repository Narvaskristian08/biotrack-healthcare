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
  const [resetCode, setResetCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [stage, setStage] = useState<"email" | "verify" | "reset" | "complete">("email")

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setStage("verify")
  }

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setStage("reset")
  }

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match")
      return
    }
    setStage("complete")
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
          {stage === "email" && (
            <>
              <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold text-foreground">Reset Password</h1>
                <p className="text-muted-foreground">Enter your email to receive reset instructions</p>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-4">
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
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white font-semibold py-2 rounded-lg"
                >
                  Send Reset Link
                </Button>
              </form>
            </>
          )}

          {stage === "verify" && (
            <>
              <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold text-foreground">Verify Email</h1>
                <p className="text-muted-foreground">Enter the verification code sent to {email}</p>
              </div>

              <form onSubmit={handleVerifySubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-foreground">
                    Verification Code
                  </Label>
                  <Input
                    id="code"
                    type="text"
                    placeholder="000000"
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value)}
                    className="glass-sm border-white/10 bg-white/10 text-center text-2xl tracking-widest"
                    maxLength={6}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white font-semibold py-2 rounded-lg"
                >
                  Verify Code
                </Button>
              </form>
            </>
          )}

          {stage === "reset" && (
            <>
              <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold text-foreground">Create New Password</h1>
                <p className="text-muted-foreground">Enter a strong password for your account</p>
              </div>

              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-foreground">
                    New Password
                  </Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="glass-sm border-white/10 bg-white/10"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-foreground">
                    Confirm Password
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="glass-sm border-white/10 bg-white/10"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white font-semibold py-2 rounded-lg"
                >
                  Reset Password
                </Button>
              </form>
            </>
          )}

          {stage === "complete" && (
            <div className="space-y-4 text-center py-4">
              <CheckCircle className="h-16 w-16 text-primary mx-auto" />
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-foreground">Password Reset Successful</h2>
                <p className="text-muted-foreground">Your password has been updated successfully</p>
              </div>
            </div>
          )}

          {stage !== "complete" && (
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-primary hover:text-secondary transition-colors mt-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Link>
          )}

          {stage === "complete" && (
            <Link href="/login">
              <Button className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white font-semibold py-2 rounded-lg">
                Back to Login
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
