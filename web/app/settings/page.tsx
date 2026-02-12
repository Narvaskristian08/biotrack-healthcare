"use client"

import { useState } from "react"
import { Settings, Shield, Bell, Save, LogOut } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import DashboardLayout from "@/components/dashboard-layout"

export default function SettingsPage() {
  const [notifications, setNotifications] = useState({
    alerts: true,
    emails: true,
    sms: false,
  })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Settings className="h-8 w-8 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground">Manage your account and system preferences</p>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="account" className="w-full">
          <TabsList className="glass-sm border-white/10 bg-white/10">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          {/* Account Settings */}
          <TabsContent value="account" className="space-y-4">
            <Card className="glass glow-green">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-foreground">Full Name</Label>
                    <Input placeholder="Dr. Maria Santos" className="glass-sm border-white/10 bg-white/10" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">Email</Label>
                    <Input placeholder="maria.santos@clinic.com" className="glass-sm border-white/10 bg-white/10" />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-foreground">Phone</Label>
                    <Input placeholder="+63 917 123 4567" className="glass-sm border-white/10 bg-white/10" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">Facility</Label>
                    <Input placeholder="City Health Center" className="glass-sm border-white/10 bg-white/10" />
                  </div>
                </div>
                <Button className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-4">
            <Card className="glass glow-cyan">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-secondary" />
                  Change Password
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Current Password</Label>
                  <Input type="password" className="glass-sm border-white/10 bg-white/10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">New Password</Label>
                  <Input type="password" className="glass-sm border-white/10 bg-white/10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Confirm Password</Label>
                  <Input type="password" className="glass-sm border-white/10 bg-white/10" />
                </div>
                <Button className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90">
                  Update Password
                </Button>
              </CardContent>
            </Card>

            <Card className="glass glow-green">
              <CardHeader>
                <CardTitle>Two-Factor Authentication</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">Enable 2FA</p>
                    <p className="text-sm text-muted-foreground">Add extra security to your account</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications" className="space-y-4">
            <Card className="glass glow-green">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">Critical Alerts</p>
                    <p className="text-sm text-muted-foreground">
                      Receive immediate alerts for critical patient conditions
                    </p>
                  </div>
                  <Switch
                    checked={notifications.alerts}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, alerts: checked })}
                  />
                </div>
                <div className="h-px bg-white/10"></div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive daily summary emails</p>
                  </div>
                  <Switch
                    checked={notifications.emails}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, emails: checked })}
                  />
                </div>
                <div className="h-px bg-white/10"></div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">SMS Notifications</p>
                    <p className="text-sm text-muted-foreground">Receive SMS for urgent alerts</p>
                  </div>
                  <Switch
                    checked={notifications.sms}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, sms: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Settings */}
          <TabsContent value="system" className="space-y-4">
            <Card className="glass glow-cyan">
              <CardHeader>
                <CardTitle>System Configuration</CardTitle>
                <CardDescription>Manage system-wide settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-foreground">Theme</Label>
                  <select className="w-full px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-foreground">
                    <option>Dark (Default)</option>
                    <option>Light</option>
                    <option>Auto</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-foreground">Language</Label>
                  <select className="w-full px-3 py-2 bg-white/10 border border-white/10 rounded-lg text-foreground">
                    <option>English</option>
                    <option>Filipino</option>
                    <option>Spanish</option>
                  </select>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  <div>
                    <p className="font-semibold text-foreground">Data Auto-backup</p>
                    <p className="text-sm text-muted-foreground">Automatic daily backups</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card className="glass">
              <CardHeader>
                <CardTitle>Danger Zone</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full glass-sm border-white/10 bg-transparent">
                  Clear Cache
                </Button>
                <Button variant="outline" className="w-full glass-sm border-white/10 bg-transparent">
                  Export Data
                </Button>
                <Button
                  variant="destructive"
                  className="w-full bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/20"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
