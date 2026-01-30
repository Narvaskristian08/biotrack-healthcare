'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function AdminBlockchainPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Blockchain Management</h1>
        <p className="text-muted-foreground mt-1">Node status, transaction logs and record verification monitoring</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Node Status</CardTitle>
            <CardDescription>Connected nodes and health</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">4 nodes connected • Sync: 99.9%</div>
            <div className="mt-4">
              <Button variant="outline">Open node dashboard</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Latest verification transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside text-sm text-muted-foreground">
              <li>Tx 0x8f5c... - Verified record p-3</li>
              <li>Tx 0x5a4c... - Verified record p-7</li>
              <li>Tx 0x3b2c... - Verified record p-12</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
