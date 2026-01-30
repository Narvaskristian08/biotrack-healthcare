'use client'

import { useState } from 'react'
import { Mail, Lock, Eye, EyeOff, Phone, MapPin, Calendar, Shield, LogOut, Trash2, Save, Edit2, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function ProfileSettingsPage() {
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    dateOfBirth: '1990-05-15',
    address: '123 Healthcare St, Medical City, MC 12345',
    gender: 'Male',
    bloodType: 'O+',
    emergencyContact: 'Jane Doe',
    emergencyPhone: '+1 (555) 987-6543',
  })

  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  })

  const [consents, setConsents] = useState({
    dataSharing: true,
    research: false,
    marketing: false,
    notifications: true,
    thirdParty: true,
  })

  const handleProfileChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSaveProfile = () => {
    setIsEditingProfile(false)
    // Save profile logic here
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Profile & Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your personal information, privacy preferences, and account security
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Personal Info</TabsTrigger>
          <TabsTrigger value="privacy">Privacy & Consent</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        {/* Personal Information Tab */}
        <TabsContent value="profile" className="space-y-4">
          {/* Profile Header Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Your account profile details</CardDescription>
                </div>
                <Button
                  variant={isEditingProfile ? 'destructive' : 'default'}
                  onClick={() => (isEditingProfile ? setIsEditingProfile(false) : setIsEditingProfile(true))}
                  className="gap-2"
                >
                  {isEditingProfile ? (
                    <>
                      <span>Cancel</span>
                    </>
                  ) : (
                    <>
                      <Edit2 className="h-4 w-4" />
                      <span>Edit</span>
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleProfileChange('firstName', e.target.value)}
                    disabled={!isEditingProfile}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleProfileChange('lastName', e.target.value)}
                    disabled={!isEditingProfile}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      className="pl-10"
                      value={formData.email}
                      onChange={(e) => handleProfileChange('email', e.target.value)}
                      disabled={!isEditingProfile}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      className="pl-10"
                      value={formData.phone}
                      onChange={(e) => handleProfileChange('phone', e.target.value)}
                      disabled={!isEditingProfile}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Medical Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Medical Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="dob"
                      type="date"
                      className="pl-10"
                      value={formData.dateOfBirth}
                      onChange={(e) => handleProfileChange('dateOfBirth', e.target.value)}
                      disabled={!isEditingProfile}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <select
                    id="gender"
                    value={formData.gender}
                    onChange={(e) => handleProfileChange('gender', e.target.value)}
                    disabled={!isEditingProfile}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm disabled:opacity-50"
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="blood">Blood Type</Label>
                  <select
                    id="blood"
                    value={formData.bloodType}
                    onChange={(e) => handleProfileChange('bloodType', e.target.value)}
                    disabled={!isEditingProfile}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm disabled:opacity-50"
                  >
                    <option>O+</option>
                    <option>O-</option>
                    <option>A+</option>
                    <option>A-</option>
                    <option>B+</option>
                    <option>B-</option>
                    <option>AB+</option>
                    <option>AB-</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Address & Emergency Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="address"
                    className="pl-10"
                    value={formData.address}
                    onChange={(e) => handleProfileChange('address', e.target.value)}
                    disabled={!isEditingProfile}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergencyContact">Emergency Contact Name</Label>
                  <Input
                    id="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={(e) => handleProfileChange('emergencyContact', e.target.value)}
                    disabled={!isEditingProfile}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyPhone">Emergency Contact Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="emergencyPhone"
                      className="pl-10"
                      value={formData.emergencyPhone}
                      onChange={(e) => handleProfileChange('emergencyPhone', e.target.value)}
                      disabled={!isEditingProfile}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          {isEditingProfile && (
            <Button onClick={handleSaveProfile} className="w-full gap-2">
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          )}
        </TabsContent>

        {/* Privacy & Consent Tab */}
        <TabsContent value="privacy" className="space-y-4">
          {/* Privacy Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Privacy & Data Sharing</CardTitle>
              <CardDescription>Control how your health data is used and shared</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Data Sharing Consent */}
              <div className="space-y-4">
                {Object.entries(consents).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="font-medium text-sm capitalize">
                        {key === 'dataSharing'
                          ? 'Healthcare Provider Data Sharing'
                          : key === 'research'
                            ? 'Medical Research Participation'
                            : key === 'marketing'
                              ? 'Marketing Communications'
                              : key === 'notifications'
                                ? 'Health Notifications'
                                : 'Third-Party App Integration'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {key === 'dataSharing'
                          ? 'Allow sharing with your healthcare providers'
                          : key === 'research'
                            ? 'Participate in anonymized medical research'
                            : key === 'marketing'
                              ? 'Receive promotional content'
                              : key === 'notifications'
                                ? 'Receive health alerts and reminders'
                                : 'Connect third-party health apps'}
                      </p>
                    </div>
                    <button
                      onClick={() => setConsents((prev) => ({ ...prev, [key]: !prev[key as keyof typeof consents] }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        value ? 'bg-green-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          value ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Consent Documentation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Terms & Conditions</CardTitle>
              <CardDescription>Review our privacy policy and terms of service</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start">
                Privacy Policy
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Terms of Service
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Data Processing Agreement
              </Button>
            </CardContent>
          </Card>

          {/* GDPR & Data Rights */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-base text-blue-900">Your Data Rights</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-blue-900 space-y-2">
              <p>Under GDPR and similar regulations, you have the right to:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Access your personal data</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Export your data in portable format</li>
                <li>Withdraw consent at any time</li>
              </ul>
              <Button variant="outline" size="sm" className="mt-3">
                Request Data Export
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          {/* Password Change */}
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your login password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current">Current Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="current"
                    type={showPassword ? 'text' : 'password'}
                    className="pl-10"
                    placeholder="Enter current password"
                    value={passwordData.current}
                    onChange={(e) => setPasswordData((prev) => ({ ...prev, current: e.target.value }))}
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="new"
                    type={showPassword ? 'text' : 'password'}
                    className="pl-10"
                    placeholder="Enter new password"
                    value={passwordData.new}
                    onChange={(e) => setPasswordData((prev) => ({ ...prev, new: e.target.value }))}
                  />
                </div>
                <p className="text-xs text-muted-foreground">At least 8 characters with uppercase, lowercase, and numbers</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirm"
                    type={showPassword ? 'text' : 'password'}
                    className="pl-10"
                    placeholder="Confirm new password"
                    value={passwordData.confirm}
                    onChange={(e) => setPasswordData((prev) => ({ ...prev, confirm: e.target.value }))}
                  />
                </div>
              </div>

              <Button className="w-full gap-2">
                <Lock className="h-4 w-4" />
                Update Password
              </Button>
            </CardContent>
          </Card>

          {/* Two-Factor Authentication */}
          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication</CardTitle>
              <CardDescription>Add an extra layer of security to your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between p-3 rounded-lg border border-border">
                <div>
                  <p className="font-medium text-sm">Authenticator App</p>
                  <p className="text-xs text-muted-foreground mt-1">Use an authentication app like Google Authenticator</p>
                </div>
                <Badge className="bg-amber-100 text-amber-800">Not Enabled</Badge>
              </div>
              <Button variant="outline" className="w-full">
                Enable 2FA
              </Button>
            </CardContent>
          </Card>

          {/* Active Sessions */}
          <Card>
            <CardHeader>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>Manage your login sessions across devices</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-start justify-between p-3 rounded-lg bg-muted border border-border">
                  <div>
                    <p className="font-medium text-sm">Chrome on Windows</p>
                    <p className="text-xs text-muted-foreground">192.168.1.100 • Last active 2 hours ago</p>
                  </div>
                  <Badge className="bg-green-100 text-green-800 gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Current
                  </Badge>
                </div>

                <div className="flex items-start justify-between p-3 rounded-lg border border-border">
                  <div>
                    <p className="font-medium text-sm">Safari on iPhone</p>
                    <p className="text-xs text-muted-foreground">203.45.67.89 • Last active 1 day ago</p>
                  </div>
                  <Button size="sm" variant="ghost">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Button variant="outline" className="w-full">
                Logout All Other Sessions
              </Button>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-900">Danger Zone</CardTitle>
              <CardDescription className="text-red-800">Irreversible account actions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full border-red-300 text-red-600 hover:bg-red-100">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
              <p className="text-xs text-red-800">This action cannot be undone. All your data will be permanently deleted.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
