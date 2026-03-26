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
  ClipboardList,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDashboardRole, type UserRole } from '@/hooks/use-dashboard-role'
import { resolveAuthenticatedHomePath } from '@/lib/auth'
import LogoutConfirmDialog from '@/components/logout-confirm-dialog'

type NavItem = { label: string; href: string; icon: React.ComponentType<{ className?: string }> }
type NavGroup = { label: string; items: NavItem[] }

type MunicipalCoverageTierId = 'starter' | 'citywide' | 'enterprise'

const MUNICIPAL_TIER_RANK: Record<MunicipalCoverageTierId, number> = {
  starter: 0,
  citywide: 1,
  enterprise: 2,
}

function normalizeMunicipalCoverageTierId(value?: string): MunicipalCoverageTierId {
  if (value === 'enterprise') return 'enterprise'
  if (value === 'citywide') return 'citywide'
  return 'starter'
}

function municipalTierAtLeast(current: MunicipalCoverageTierId, required: MunicipalCoverageTierId): boolean {
  return MUNICIPAL_TIER_RANK[current] >= MUNICIPAL_TIER_RANK[required]
}

const PATIENT_NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', href: '/patient-dashboard', icon: Home }],
  },
  {
    label: 'Care And Monitoring',
    items: [
      { label: 'Health Monitoring', href: '/health-monitoring', icon: Activity },
      { label: 'Vitals History', href: '/vitals-history', icon: LineChart },
      { label: 'AI Health Advisory', href: '/ai-health-advisory', icon: Bot },
    ],
  },
  {
    label: 'Records And Proofs',
    items: [
      { label: 'Medical Records', href: '/medical-records', icon: FileText },
      { label: 'Blockchain', href: '/blockchain', icon: Lock },
      { label: 'Reports & Downloads', href: '/reports-downloads', icon: FileDown },
    ],
  },
]

const PROVIDER_NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [{ label: 'Dashboard', href: '/provider-dashboard', icon: Home }],
  },
  {
    label: 'Patient Operations',
    items: [
      { label: 'Users', href: '/users', icon: Users },
      { label: 'Records', href: '/records', icon: FileText },
    ],
  },
  {
    label: 'Analytics',
    items: [{ label: 'Analytics', href: '/analytics', icon: BarChart3 }],
  },
]

const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Admin Dashboard', href: '/admin-dashboard', icon: Home },
      { label: 'System Monitoring', href: '/admin/system-monitoring', icon: Cpu },
    ],
  },
  {
    label: 'Operations',
    items: [
      { label: 'User Management', href: '/admin/users', icon: Users },
      { label: 'Municipal Applications', href: '/admin/municipal-onboarding', icon: ClipboardList },
    ],
  },
  {
    label: 'Security And Compliance',
    items: [
      { label: 'System Logs', href: '/admin/logs', icon: Activity },
      { label: 'RBAC Policies', href: '/admin/ai-configuration', icon: Shield },
      { label: 'Blockchain Mgmt', href: '/admin/blockchain-management', icon: Lock },
    ],
  },
  {
    label: 'Resilience',
    items: [{ label: 'Backup & Recovery', href: '/admin/backup-recovery', icon: Database }],
  },
]

function getNavigationGroups(role: UserRole): NavGroup[] {
  if (role === 'patient') return PATIENT_NAV_GROUPS
  if (role === 'admin') return ADMIN_NAV_GROUPS
  return PROVIDER_NAV_GROUPS
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

function getProfileHref(role: UserRole): string {
  if (role === 'patient') return '/profile-settings'
  return '/settings'
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

function toTitleCaseFromPath(pathname: string): string {
  const segment = pathname.split('/').filter(Boolean).pop() ?? ''
  if (!segment) return 'Dashboard'
  return segment
    .split('-')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ')
}

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { role, sessionUser, logout } = useDashboardRole()
  const [logoutDialogOpen, setLogoutDialogOpen] = React.useState(false)
  const [logoutPending, setLogoutPending] = React.useState(false)
  const navigationGroups = getNavigationGroups(role)
  const isMunicipalAdmin = role === 'admin' && sessionUser?.adminScope === 'municipal'
  const municipalTierId = normalizeMunicipalCoverageTierId(sessionUser?.adminCoverageTierId)
  const municipalHiddenPaths = React.useMemo(() => {
    if (!isMunicipalAdmin) return new Set<string>()
    const hidden = new Set<string>(['/admin/ai-configuration', '/admin/backup-recovery', '/admin/municipal-onboarding'])
    if (!municipalTierAtLeast(municipalTierId, 'citywide')) {
      hidden.add('/admin/system-monitoring')
      hidden.add('/admin/logs')
    }
    if (!municipalTierAtLeast(municipalTierId, 'enterprise')) {
      hidden.add('/admin/blockchain-management')
    }
    return hidden
  }, [isMunicipalAdmin, municipalTierId])
  const filteredNavigationGroups = isMunicipalAdmin
    ? navigationGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => !municipalHiddenPaths.has(item.href)),
      }))
      .filter((group) => group.items.length > 0)
    : navigationGroups
  const navigationItems = filteredNavigationGroups.flatMap((group) => group.items)
  const roleLabel = getRoleLabel(role)
  const profileHref = getProfileHref(role)
  const homeHref = resolveAuthenticatedHomePath(role, sessionUser?.adminScope)
  const displayName = getDisplayName(sessionUser, role)
  const displayInitials = getInitialsFromName(sessionUser?.name, sessionUser?.firstName, sessionUser?.lastName) || role[0].toUpperCase()
  const activeNavItem =
    navigationItems.find((item) => pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`))) ?? null
  const pageTitle = activeNavItem?.label ?? toTitleCaseFromPath(pathname)

  const requestLogout = () => {
    setLogoutDialogOpen(true)
  }

  const handleLogout = async () => {
    setLogoutPending(true)
    try {
      await logout()
      router.push('/login')
    } finally {
      setLogoutPending(false)
      setLogoutDialogOpen(false)
    }
  }

  return (
    <SidebarProvider>
      <LogoutConfirmDialog
        open={logoutDialogOpen}
        onOpenChange={setLogoutDialogOpen}
        onConfirm={handleLogout}
        loading={logoutPending}
      />
      <div className="flex h-screen w-full">
        {/* Sidebar */}
        <Sidebar className="border-r border-sidebar-border/80 bg-sidebar/95 backdrop-blur-sm">
          <SidebarHeader className="shrink-0 border-b border-sidebar-border/80 px-4 py-4">
            <Link
              href={homeHref}
              className="flex items-center gap-3 rounded-xl border border-sidebar-border/70 bg-background/70 px-3 py-3 shadow-sm transition-colors hover:bg-background"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-primary to-accent shadow-sm">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg bg-linear-to-r from-primary to-accent bg-clip-text text-transparent">
                  BioTrack
                </span>
                <span className="text-xs text-muted-foreground">{roleLabel}</span>
              </div>
            </Link>
          </SidebarHeader>

          <SidebarContent className="px-3 py-4">
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/55">Navigation</p>
            {filteredNavigationGroups.map((group) => (
              <SidebarGroup key={group.label}>
                <SidebarGroupLabel className="px-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/50">
                  {group.label}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="gap-1.5">
                    {group.items.map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href
                      return (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton
                            asChild
                            isActive={isActive}
                            className={cn(
                              'group h-11 rounded-xl px-3.5',
                              isActive
                                ? 'bg-primary/12 text-primary shadow-sm ring-1 ring-primary/20'
                                : 'text-sidebar-foreground/85 hover:bg-sidebar-accent/10 hover:text-sidebar-foreground'
                            )}
                          >
                            <Link href={item.href} className="flex items-center gap-3">
                              <span
                                className={cn(
                                  'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                                  isActive
                                    ? 'bg-white/20 text-white ring-1 ring-white/30'
                                    : 'text-sidebar-foreground/70 group-hover:bg-sidebar-accent/15 group-hover:text-sidebar-foreground'
                                )}
                              >
                                <Icon className="h-4 w-4" />
                              </span>
                              <span className="font-medium tracking-tight">{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>

          <SidebarFooter className="border-t border-sidebar-border/80 px-3 py-4">
            <div className="rounded-xl border border-sidebar-border/70 bg-background/60 px-3 py-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-sidebar-foreground/55">Signed in as</p>
              <p className="mt-1 truncate text-sm font-semibold">{displayName}</p>
              <p className="truncate text-xs text-sidebar-foreground/65">{sessionUser?.email || roleLabel}</p>
            </div>
            <SidebarMenu className="mt-2 gap-1.5">
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-10 rounded-lg px-3">
                  <Link href="/settings" className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-accent/10 text-sidebar-foreground/80">
                      <Settings className="h-4 w-4" />
                    </span>
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  className="h-10 rounded-lg px-3 text-red-600 hover:bg-red-500/10 hover:text-red-600 data-[active=true]:bg-red-500/10 data-[active=true]:text-red-600"
                  onClick={requestLogout}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-red-500/10 text-red-600">
                    <LogOut className="h-4 w-4" />
                  </span>
                  <span>Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-md">
            <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
              {/* Left Section */}
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <SidebarTrigger className="h-9 w-9 rounded-lg border border-border/70 bg-background hover:bg-muted/70" />
                <div className="hidden h-6 w-px bg-border/70 sm:block" />
                <div className="min-w-0">
                  <p className="truncate text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {roleLabel}
                  </p>
                  <p className="truncate text-sm font-semibold text-foreground">{pageTitle}</p>
                </div>
              </div>

              {/* Center Section - Search */}
              <div className="hidden lg:flex w-full max-w-md">
                <div className="relative w-full">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={role === 'patient' ? 'Search my records...' : 'Search patients, records...'}
                    className="h-10 rounded-xl border-border/70 bg-muted/35 pl-10 shadow-sm focus-visible:ring-2 focus-visible:ring-primary/30"
                  />
                </div>
              </div>

              {/* Right Section */}
              <div className="flex items-center gap-2">
                <div className={`hidden md:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${getRoleBadgeColor(role)}`}>
                  {getRoleIcon(role)}
                  <span>{roleLabel}</span>
                </div>

                {/* Notifications */}
                <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-lg border border-transparent hover:border-border hover:bg-muted/70">
                  <Bell className="h-4 w-4" />
                  <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent" />
                </Button>

                {/* Help */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden h-9 w-9 rounded-lg border border-transparent hover:border-border hover:bg-muted/70 sm:flex"
                  asChild
                >
                  <Link href="/help-support">
                    <HelpCircle className="h-4 w-4" />
                  </Link>
                </Button>

                {/* User Profile Dropdown - shows user name and role */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-10 rounded-xl border border-border/70 bg-background px-2 pr-3 shadow-sm hover:bg-muted/40"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-primary/20 to-accent/20">
                        <span className="text-xs font-semibold text-primary">{displayInitials}</span>
                      </div>
                      <div className="hidden sm:flex min-w-0 flex-col items-start text-left">
                        <span className="max-w-40 truncate text-sm font-medium">{displayName}</span>
                        <span className="text-xs text-muted-foreground">{pageTitle}</span>
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
                      <Link href={profileHref}>Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings">Settings</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/help-support">Help & Support</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600" onClick={requestLogout}>
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto bg-linear-to-br from-background to-muted/30">
            <div className="p-6 md:p-8">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
