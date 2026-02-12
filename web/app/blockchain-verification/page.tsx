'use client'

import { useState } from 'react'
import { Shield, Lock, CheckCircle2, Copy, Eye, EyeOff, Download, Share2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface BlockchainRecord {
  id: string
  recordType: string
  recordDate: string
  hash: string
  timestamp: string
  blockNumber: number
  transactionId: string
  status: 'verified' | 'pending' | 'failed'
  verificationDetails: {
    timestamp: string
    gasUsed: string
    minerAddress: string
    confirmations: number
  }
}

export default function BlockchainVerificationPage() {
  const [showFullHash, setShowFullHash] = useState<string | null>(null)
  const [copiedHash, setCopiedHash] = useState<string | null>(null)

  const blockchainRecords: BlockchainRecord[] = [
    {
      id: '1',
      recordType: 'Annual Checkup',
      recordDate: '2026-01-15',
      hash: '0x8f5c2d9a4b1e7c3f6a9d2e1c5b8a3f7d9c2e1a4b5c6d7e8f9a0b1c2d3e4f5a',
      timestamp: '2026-01-15 10:30:45 UTC',
      blockNumber: 18547392,
      transactionId: '0x4d2e1c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3',
      status: 'verified',
      verificationDetails: {
        timestamp: '2026-01-15 10:32:15 UTC',
        gasUsed: '52,341 wei',
        minerAddress: '0x2a3f4d5e6c7b8a9f0e1d2c3b4a5f6e7d8c9a0b1',
        confirmations: 156,
      },
    },
    {
      id: '2',
      recordType: 'Blood Work',
      recordDate: '2026-01-10',
      hash: '0x5a4c3e2d1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5',
      timestamp: '2026-01-10 14:15:30 UTC',
      blockNumber: 18544521,
      transactionId: '0x9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f',
      status: 'verified',
      verificationDetails: {
        timestamp: '2026-01-10 14:18:00 UTC',
        gasUsed: '48,127 wei',
        minerAddress: '0x1f2e3d4c5b6a7f8e9d0c1b2a3f4e5d6c7b8a9f0',
        confirmations: 412,
      },
    },
    {
      id: '3',
      recordType: 'Vaccination Record',
      recordDate: '2025-12-20',
      hash: '0x3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3',
      timestamp: '2025-12-20 11:45:22 UTC',
      blockNumber: 18532104,
      transactionId: '0x7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e7d6c5b4a3f2e1d0c9b8a',
      status: 'verified',
      verificationDetails: {
        timestamp: '2025-12-20 11:47:45 UTC',
        gasUsed: '45,892 wei',
        minerAddress: '0x3d4e5f6c7b8a9f0e1d2c3b4a5f6e7d8c9a0b1f2',
        confirmations: 1250,
      },
    },
    {
      id: '4',
      recordType: 'Specialist Consultation',
      recordDate: '2025-11-05',
      hash: '0x9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9',
      timestamp: '2025-11-05 09:20:11 UTC',
      blockNumber: 18502847,
      transactionId: '0x1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c',
      status: 'verified',
      verificationDetails: {
        timestamp: '2025-11-05 09:23:30 UTC',
        gasUsed: '54,671 wei',
        minerAddress: '0x5f6e7d8c9a0b1f2e3d4c5b6a7f8e9d0c1b2a3f4',
        confirmations: 2189,
      },
    },
  ]

  const copyToClipboard = (hash: string, id: string) => {
    navigator.clipboard.writeText(hash)
    setCopiedHash(id)
    setTimeout(() => setCopiedHash(null), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Blockchain Verification</h1>
        <p className="text-muted-foreground mt-1">
          Transparent view of your immutable health records secured on blockchain
        </p>
      </div>

      {/* Verification Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{blockchainRecords.length}</div>
            <p className="text-xs text-muted-foreground mt-1">On blockchain</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Verified</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {blockchainRecords.filter((r) => r.status === 'verified').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Confirmed records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Confirmations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {Math.round(
                blockchainRecords.reduce((sum, r) => sum + r.verificationDetails.confirmations, 0) /
                  blockchainRecords.length
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Network confirmations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Latest Block</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{blockchainRecords[0].blockNumber.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Current height</p>
          </CardContent>
        </Card>
      </div>

      {/* Security Information */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <div className="flex gap-3">
            <Shield className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <CardTitle className="text-base text-green-900">Immutable & Tamper-Proof</CardTitle>
              <CardDescription className="text-green-800 mt-2">
                Your health records are cryptographically secured on the blockchain. Once recorded, they cannot be altered or
                deleted, ensuring complete transparency and authenticity of your medical history.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Blockchain Records Table */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">Record Hash Verification</h2>
        {blockchainRecords.map((record) => (
          <BlockchainRecordCard
            key={record.id}
            record={record}
            showFullHash={showFullHash}
            setShowFullHash={setShowFullHash}
            copiedHash={copiedHash}
            onCopy={copyToClipboard}
          />
        ))}
      </div>

      {/* How It Works */}
      <Card>
        <CardHeader>
          <CardTitle>How Blockchain Verification Works</CardTitle>
          <CardDescription>Understanding your record security</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center font-semibold text-sm flex-shrink-0">
                1
              </div>
              <div>
                <p className="font-semibold">Record Hashing</p>
                <p className="text-sm text-muted-foreground">
                  Your medical record is converted into a unique cryptographic hash using SHA-256 algorithm.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center font-semibold text-sm flex-shrink-0">
                2
              </div>
              <div>
                <p className="font-semibold">Blockchain Recording</p>
                <p className="text-sm text-muted-foreground">
                  The hash is recorded in a block with other records, creating an immutable chain linked by cryptographic
                  hashes.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center font-semibold text-sm flex-shrink-0">
                3
              </div>
              <div>
                <p className="font-semibold">Network Confirmation</p>
                <p className="text-sm text-muted-foreground">
                  Multiple network nodes verify the transaction, and confirmations increase as new blocks are added.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center font-semibold text-sm flex-shrink-0">
                4
              </div>
              <div>
                <p className="font-semibold">Permanent Record</p>
                <p className="text-sm text-muted-foreground">
                  Once confirmed, your record cannot be altered. Any changes would invalidate the hash and alert the
                  network.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transparency View Notice */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <CardTitle className="text-base text-blue-900">No Editing - Transparency View Only</CardTitle>
              <CardDescription className="text-blue-800 mt-2">
                This is a read-only transparency view. Your records cannot be edited or deleted once recorded on the
                blockchain. This ensures the integrity and authenticity of your medical history.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  )
}

interface BlockchainRecordCardProps {
  record: BlockchainRecord
  showFullHash: string | null
  setShowFullHash: (id: string | null) => void
  copiedHash: string | null
  onCopy: (hash: string, id: string) => void
}

function BlockchainRecordCard({
  record,
  showFullHash,
  setShowFullHash,
  copiedHash,
  onCopy,
}: BlockchainRecordCardProps) {
  const isExpanded = showFullHash === record.id

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <CardTitle className="text-lg">{record.recordType}</CardTitle>
              <Badge className="bg-green-100 text-green-800 gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
              </Badge>
            </div>
            <CardDescription>{record.recordDate}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Hash */}
        <div>
          <p className="text-sm font-semibold text-muted-foreground mb-2">Record Hash</p>
          <div className="flex items-center gap-2">
            <code className="text-xs bg-muted p-2 rounded flex-1 overflow-hidden text-ellipsis font-mono">
              {isExpanded ? record.hash : `${record.hash.substring(0, 24)}...`}
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
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onCopy(record.hash, record.id)}
            >
              <Copy className={`h-4 w-4 ${copiedHash === record.id ? 'text-green-600' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Blockchain Details Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground font-semibold mb-1">BLOCK NUMBER</p>
            <p className="text-sm font-mono font-bold">{record.blockNumber.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold mb-1">TIMESTAMP</p>
            <p className="text-sm">{record.timestamp}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold mb-1">CONFIRMATIONS</p>
            <p className="text-sm font-mono font-bold">{record.verificationDetails.confirmations}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold mb-1">GAS USED</p>
            <p className="text-sm font-mono">{record.verificationDetails.gasUsed}</p>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="pt-4 space-y-3 border-t">
            <div>
              <p className="text-xs text-muted-foreground font-semibold mb-1">TRANSACTION ID</p>
              <code className="text-xs bg-muted p-2 rounded block overflow-hidden text-ellipsis font-mono">
                {record.transactionId}
              </code>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold mb-1">MINER ADDRESS</p>
              <code className="text-xs bg-muted p-2 rounded block overflow-hidden text-ellipsis font-mono">
                {record.verificationDetails.minerAddress}
              </code>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold mb-1">VERIFICATION TIME</p>
              <p className="text-sm">{record.verificationDetails.timestamp}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1 gap-2">
            <Share2 className="h-4 w-4" />
            Share Proof
          </Button>
          <Button variant="outline" size="sm" className="flex-1 gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
