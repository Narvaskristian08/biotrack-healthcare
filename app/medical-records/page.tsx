'use client'

import { useState } from 'react'
import { Shield, Lock, CheckCircle2, Download, Eye, EyeOff } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import DashboardLayout from '@/components/dashboard-layout'

interface MedicalRecord {
  id: string
  type: string
  date: string
  provider: string
  diagnosis: string
  notes: string
  blockchainHash: string
  verified: boolean
  verifiedDate: string
}

export default function MedicalRecordsPage() {
  const [showFullHash, setShowFullHash] = useState<string | null>(null)

  const medicalRecords: MedicalRecord[] = [
    {
      id: '1',
      type: 'Annual Checkup',
      date: '2026-01-15',
      provider: 'Dr. Sarah Johnson, MD',
      diagnosis: 'Overall Health: Excellent',
      notes: 'Patient in excellent health with no medical concerns. Continue current exercise routine and maintain healthy diet.',
      blockchainHash: '0x8f5c2d9a4b1e7c3f6a9d2e1c5b8a3f7d9c2e1a4b5c6d7e8f9a0b1c2d3e4f5a',
      verified: true,
      verifiedDate: '2026-01-15',
    },
    {
      id: '2',
      type: 'Blood Work',
      date: '2026-01-10',
      provider: 'Lab Services - Central Medical',
      diagnosis: 'Routine Laboratory Results',
      notes: 'All values within normal range. Cholesterol levels optimal. Glucose levels stable.',
      blockchainHash: '0x5a4c3e2d1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5',
      verified: true,
      verifiedDate: '2026-01-11',
    },
    {
      id: '3',
      type: 'Vaccination Record',
      date: '2025-12-20',
      provider: 'Central Vaccination Center',
      diagnosis: 'Flu Vaccination',
      notes: 'Administered annual influenza vaccine. No adverse reactions reported.',
      blockchainHash: '0x3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3',
      verified: true,
      verifiedDate: '2025-12-20',
    },
    {
      id: '4',
      type: 'Specialist Consultation',
      date: '2025-11-05',
      provider: 'Dr. Michael Chen, Cardiologist',
      diagnosis: 'Cardiac Health Assessment',
      notes: 'Comprehensive cardiac evaluation completed. Heart function normal. No abnormalities detected on ECG.',
      blockchainHash: '0x9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9',
      verified: true,
      verifiedDate: '2025-11-06',
    },
  ]

  return (
    <DashboardLayout>
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Medical Records</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Your complete medical history with blockchain verification for authenticity
        </p>
      </header>

      {/* Records Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{medicalRecords.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Chronological history</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Verified Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {medicalRecords.filter((r) => r.verified).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Blockchain secured</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Updated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{medicalRecords[0].date}</div>
            <p className="text-xs text-muted-foreground mt-1">Recent records</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1">
          <TabsTrigger value="all" className="rounded-md">All Records</TabsTrigger>
          <TabsTrigger value="checkups" className="rounded-md">Checkups</TabsTrigger>
          <TabsTrigger value="lab" className="rounded-md">Lab Work</TabsTrigger>
          <TabsTrigger value="vaccines" className="rounded-md">Vaccines</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4 mt-4">
          {medicalRecords.map((record) => (
            <MedicalRecordCard key={record.id} record={record} showFullHash={showFullHash} setShowFullHash={setShowFullHash} />
          ))}
        </TabsContent>

        <TabsContent value="checkups" className="space-y-4 mt-4">
          {medicalRecords
            .filter((r) => r.type === 'Annual Checkup' || r.type === 'Specialist Consultation')
            .map((record) => (
              <MedicalRecordCard key={record.id} record={record} showFullHash={showFullHash} setShowFullHash={setShowFullHash} />
            ))}
        </TabsContent>

        <TabsContent value="lab" className="space-y-4 mt-4">
          {medicalRecords
            .filter((r) => r.type === 'Blood Work')
            .map((record) => (
              <MedicalRecordCard key={record.id} record={record} showFullHash={showFullHash} setShowFullHash={setShowFullHash} />
            ))}
        </TabsContent>

        <TabsContent value="vaccines" className="space-y-4 mt-4">
          {medicalRecords
            .filter((r) => r.type === 'Vaccination Record')
            .map((record) => (
              <MedicalRecordCard key={record.id} record={record} showFullHash={showFullHash} setShowFullHash={setShowFullHash} />
            ))}
        </TabsContent>
      </Tabs>

      {/* Read-Only Access Note */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <div className="flex gap-3">
            <Lock className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <CardTitle className="text-base">Read-Only Access</CardTitle>
              <CardDescription className="mt-2">
                Your medical records are stored securely and displayed in read-only format to ensure data integrity. To make
                changes or add new records, contact your healthcare provider.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
    </DashboardLayout>
  )
}

interface MedicalRecordCardProps {
  record: MedicalRecord
  showFullHash: string | null
  setShowFullHash: (id: string | null) => void
}

function MedicalRecordCard({ record, showFullHash, setShowFullHash }: MedicalRecordCardProps) {
  const isExpanded = showFullHash === record.id

  return (
    <Card className="hover:shadow-md transition-shadow overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <CardTitle className="text-lg">{record.type}</CardTitle>
              {record.verified && (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 gap-1 w-fit">
                  <CheckCircle2 className="h-3 w-3" />
                  Verified
                </Badge>
              )}
            </div>
            <CardDescription className="break-words">{record.provider}</CardDescription>
          </div>
          <div className="text-left sm:text-right flex-shrink-0">
            <p className="text-sm font-medium">{record.date}</p>
            <p className="text-xs text-muted-foreground">Record date</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Diagnosis */}
        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-1">Diagnosis</p>
          <p className="text-sm">{record.diagnosis}</p>
        </div>

        {/* Notes */}
        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-1">Clinical Notes</p>
          <p className="text-sm text-foreground">{record.notes}</p>
        </div>

        {/* Blockchain Verification */}
        <div className="p-3 rounded-lg bg-muted border border-border">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-600" />
              <p className="text-sm font-semibold">Blockchain Verification</p>
            </div>
            {record.verified && (
              <span className="text-xs text-green-600 font-medium">Verified {record.verifiedDate}</span>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <code className="text-xs bg-background p-2 rounded flex-1 overflow-hidden text-ellipsis">
                {isExpanded ? record.blockchainHash : `${record.blockchainHash.substring(0, 16)}...`}
              </code>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowFullHash(isExpanded ? null : record.id)}
              >
                {isExpanded ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>

            {isExpanded && (
              <p className="text-xs text-muted-foreground">
                This hash ensures record integrity and authenticity on the blockchain network.
              </p>
            )}
          </div>
        </div>

        {/* Download Button */}
        <Button variant="outline" className="w-full gap-2">
          <Download className="h-4 w-4" />
          Download Record
        </Button>
      </CardContent>
    </Card>
  )
}
