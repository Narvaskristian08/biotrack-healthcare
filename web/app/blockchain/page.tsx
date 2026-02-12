"use client"

import { useState } from "react"
import { Lock, CheckCircle, RefreshCw, Copy } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import DashboardLayout from "@/components/dashboard-layout"

export default function BlockchainPage() {
  const [hashInput, setHashInput] = useState("")
  const [verificationResult, setVerificationResult] = useState<any>(null)

  const handleVerify = () => {
    // Simulate verification
    setVerificationResult({
      hash: hashInput,
      verified: true,
      timestamp: new Date().toISOString(),
      owner: "Maria Santos",
      dataType: "Heart Rate Record",
      chain: "BioChain v1",
      blockNumber: 12547,
    })
  }

  const blockchainStats = [
    { label: "Total Blocks", value: "12,547", icon: "📦" },
    { label: "Total Transactions", value: "34,892", icon: "🔄" },
    { label: "Network Status", value: "Active", icon: "🟢" },
    { label: "Last Block Time", value: "2 seconds ago", icon: "⏱️" },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Lock className="h-8 w-8 text-primary" />
            Blockchain Verification
          </h1>
          <p className="text-muted-foreground">Verify and authenticate patient health records</p>
        </div>

        {/* Verification Tool */}
        <Card className="glass-lg glow-green">
          <CardHeader>
            <CardTitle>Verify Record Hash</CardTitle>
            <CardDescription>
              Enter a record hash to verify its authenticity and view blockchain details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Paste record hash (0x...)"
                  value={hashInput}
                  onChange={(e) => setHashInput(e.target.value)}
                  className="glass-sm border-white/10 bg-white/10 font-mono text-sm"
                />
              </div>
              <Button
                onClick={handleVerify}
                className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Verify
              </Button>
            </div>

            {verificationResult && (
              <div className="mt-6 p-4 bg-white/10 border border-white/10 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-foreground">Record Verified Successfully</span>
                </div>

                <div className="grid gap-3 pt-3 border-t border-white/10">
                  <div className="flex justify-between items-start">
                    <span className="text-muted-foreground">Hash:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-foreground break-all">{verificationResult.hash}</span>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Block Number:</span>
                    <span className="font-semibold text-foreground">{verificationResult.blockNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Data Type:</span>
                    <span className="font-semibold text-foreground">{verificationResult.dataType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Patient:</span>
                    <span className="font-semibold text-foreground">{verificationResult.owner}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Blockchain:</span>
                    <Badge className="bg-accent/20 text-accent">{verificationResult.chain}</Badge>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Blockchain Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {blockchainStats.map((stat, idx) => (
            <Card key={idx} className="glass">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Network Info */}
        <Card className="glass glow-cyan">
          <CardHeader>
            <CardTitle>Blockchain Network</CardTitle>
            <CardDescription>Current network status and information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 bg-white/10 border border-white/10 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Network Name</p>
                <p className="text-lg font-semibold text-foreground">BioChain Network v1</p>
              </div>
              <div className="p-4 bg-white/10 border border-white/10 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Consensus Type</p>
                <p className="text-lg font-semibold text-foreground">Proof of Authority</p>
              </div>
              <div className="p-4 bg-white/10 border border-white/10 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Gas Price</p>
                <p className="text-lg font-semibold text-foreground">1 Wei/Gas</p>
              </div>
              <div className="p-4 bg-white/10 border border-white/10 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Network Health</p>
                <Badge className="bg-primary/20 text-primary">Optimal</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
