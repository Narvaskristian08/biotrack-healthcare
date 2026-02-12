'use client'

import React from "react"

import {
  Heart,
  Home,
  Users,
  BarChart3,
  FileText,
  Lock,
  Settings,
  LogOut,
  Search,
  Bell,
  HelpCircle,
  Activity,
  LineChart,
  Bot,
  FileDown,
  User,
  Shield,
  Building2,
  Database,
  Cpu,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDashboardRole, type UserRole } from '@/hooks/use-dashboard-role'
import { Badge } from '@/components/ui/badge'

type NavItem = { label: string; href: string; icon: React.ComponentType<{ className?: string }> }

const PATIENT_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: Home },
  { label: 'Health Monitoring', href: '/health-monitoring', icon: Activity },
  { label: 'Medical Records', href: '/medical-records', icon: FileText },
  { label: 'Vitals History', href: '/vitals-history', icon: LineChart },
  { label: 'AI Health Advisory', href: '/ai-health-advisory', icon: Bot },
  { label: 'Blockchain', href: '/blockchain', icon: Lock },
  { label: 'Reports & Downloads', href: '/reports-downloads', icon: FileDown },
]

const PROVIDER_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: Home },
  { label: 'Users', href: '/users', icon: Users },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Records', href: '/records', icon: FileText },
  { label: 'Blockchain', href: '/blockchain', icon: Lock },
]

const ADMIN_NAV: NavItem[] = [
  { label: 'Admin Dashboard', href: '/admin-dashboard', icon: Home },
  { label: 'User Management', href: '/admin/users', icon: Users },
  { label: 'System Logs', href: '/admin/logs', icon: Activity },
  { label: 'RBAC Policies', href: '/admin/ai-configuration', icon: Shield },
  { label: 'Blockchain Mgmt', href: '/admin/blockchain-management', icon: Lock },
  { label: 'Backup & Recovery', href: '/admin/backup-recovery', icon: Database },
  { label: 'System Monitoring', href: '/analytics', icon: Cpu },
]

function getNavigationItems(role: UserRole): NavItem[] {
  if (role === 'patient') return PATIENT_NAV
  if (role === 'admin') return ADMIN_NAV
  return PROVIDER_NAV
}

function getRoleLabel(role: UserRole): string {
  switch (role) {
    case 'patient':
      return 'Patient'
    case 'provider':
      return 'Healthcare Provider'
    case 'admin':
      return 'Admin'
    default:
      return 'Patient'
  }
}

function getRoleIcon(role: UserRole): React.ReactNode {
  switch (role) {
    case 'patient':
      return <User className="h-3 w-3" />
    case 'provider':
      return <Building2 className="h-3 w-3" />
    case 'admin':
      return <Shield className="h-3 w-3" />
    default:
      return <User className="h-3 w-3" />
  }
}

function getRoleBadgeColor(role: UserRole): string {
  switch (role) {
    case 'patient':
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
    case 'provider':
      return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
    case 'admin':
      return 'bg-purple-500/10 text-purple-600 border-purple-500/20'
    default:
      return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
  }
}

function getInitialsFromName(name?: string, firstName?: string, lastName?: string): string {
  // Try to get initials from firstName + lastName first
  if (firstName && lastName) {
    return (firstName[0] + lastName[0]).toUpperCase()
  }
  // Fall back to full name
  if (!name?.trim()) return ''
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return parts[0].slice(0, 2).toUpperCase()
}

function getDisplayName(sessionUser: { name?: string; firstName?: string; lastName?: string; email?: string } | null, role: UserRole): string {
  if (!sessionUser) return getRoleLabel(role)

  // For patients, show "FirstName L." format
  if (role === 'patient' && sessionUser.firstName && sessionUser.lastName) {
    return `${sessionUser.firstName} ${sessionUser.lastName[0]}.`
  }

  // For providers/admins, show the name or fallback
  if (sessionUser.name) {
    return sessionUser.name
  }

  // Fallback to email prefix
  if (sessionUser.email) {
    return sessionUser.email.split('@')[0]
  }

  return getRoleLabel(role)
}

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { role, sessionUser, logout } = useDashboardRole()
  const navigationItems = getNavigationItems(role)
  const roleLabel = getRoleLabel(role)
  const displayName = getDisplayName(sessionUser, role)
  const displayInitials = getInitialsFromName(sessionUser?.name, sessionUser?.firstName, sessionUser?.lastName) || role[0].toUpperCase()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        {/* Sidebar */}
        <Sidebar className="border-r border-border">
          <SidebarHeader className="border-b border-border h-16 flex flex-col justify-center px-4 shrink-0">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-md">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  BioTrack
                </span>
                <span className="text-xs text-muted-foreground">{roleLabel}</span>
              </div>
            </Link>
          </SidebarHeader>

          <SidebarContent>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={isActive ? 'bg-primary/10 text-primary' : ''}
                    >
                      <Link href={item.href} className="flex items-center gap-3">
                        <Icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="border-t border-border p-4 space-y-4">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/settings" className="flex items-center gap-3">
                    <Settings className="h-5 w-5" />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <Button
              variant="outline"
              className="w-full justify-start bg-transparent h-10"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </SidebarFooter>
        </Sidebar>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-40">
            <div className="flex items-center justify-between px-6 py-4 h-16">
              {/* Left Section */}
              <div className="flex items-center gap-4">
                <SidebarTrigger className="-ml-1" />
                <div className="h-6 w-px bg-border hidden sm:block" />
                {/* RBAC Badge */}
                <div className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(role)}`}>
                  {getRoleIcon(role)}
                  <span>{roleLabel}</span>
                </div>
              </div>

              {/* Center Section - Search */}
              <div className="hidden md:flex flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={role === 'patient' ? 'Search my records...' : 'Search patients, records...'}
                    className="pl-10 bg-muted border-0 focus-visible:ring-1"
                  />
                </div>
              </div>

              {/* Right Section */}
              <div className="flex items-center gap-4">
                {/* Notifications */}
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1 right-1 h-2 w-2 bg-accent rounded-full" />
                </Button>

                {/* Help */}
                <Button variant="ghost" size="icon" className="hidden sm:flex" asChild>
                  <Link href="/help-support">
                    <HelpCircle className="h-5 w-5" />
                  </Link>
                </Button>

                {/* User Profile Dropdown - shows user name and role */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-3 pl-2 pr-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
                        <span className="text-xs font-semibold text-primary">{displayInitials}</span>
                      </div>
                      <div className="hidden sm:flex flex-col items-start text-left">
                        <span className="text-sm font-medium">{displayName}</span>
                        <span className="text-xs text-muted-foreground">{roleLabel}</span>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{displayName}</p>
                        <p className="text-xs text-muted-foreground">{sessionUser?.email || 'No email'}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile-settings">Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings">Settings</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/help-support">Help & Support</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600" onClick={handleLogout}>
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto bg-gradient-to-br from-background to-muted/30">
            <div className="p-6 md:p-8">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
