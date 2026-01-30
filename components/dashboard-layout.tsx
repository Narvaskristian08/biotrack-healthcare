'use client'

import React from "react"

import { Heart, Home, Users, BarChart3, FileText, Lock, Settings, LogOut, Search, Bell, HelpCircle } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
import RoleSelector from '@/components/role-selector'

const navigationItems = [
  { label: 'Dashboard', href: '/', icon: Home },
  { label: 'Users', href: '/users', icon: Users },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Records', href: '/records', icon: FileText },
  { label: 'Blockchain', href: '/blockchain', icon: Lock },
]

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        {/* Sidebar */}
        <Sidebar className="border-r border-border">
          <SidebarHeader className="border-b border-border p-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-md">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  BioTrack
                </span>
                <span className="text-xs text-muted-foreground">Healthcare</span>
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
            <Button variant="outline" className="w-full justify-start bg-transparent h-10">
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
              </div>

              {/* Center Section - Search */}
              <div className="hidden md:flex flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search patients, records..."
                    className="pl-10 bg-muted border-0 focus-visible:ring-1"
                  />
                </div>
              </div>

              {/* Right Section */}
              <div className="flex items-center gap-4">
                {/* Role Selector */}
                <div className="hidden md:block">
                  <RoleSelector />
                </div>

                {/* Notifications */}
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-1 right-1 h-2 w-2 bg-accent rounded-full" />
                </Button>

                {/* Help */}
                <Button variant="ghost" size="icon" className="hidden sm:flex">
                  <HelpCircle className="h-5 w-5" />
                </Button>

                {/* User Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-3 pl-2 pr-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
                        <span className="text-xs font-semibold text-primary">HW</span>
                      </div>
                      <div className="hidden sm:flex flex-col items-start text-left">
                        <span className="text-sm font-medium">Health Worker</span>
                        <span className="text-xs text-muted-foreground">Online</span>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Profile</DropdownMenuItem>
                    <DropdownMenuItem>Settings</DropdownMenuItem>
                    <DropdownMenuItem>Help & Support</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600">Logout</DropdownMenuItem>
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
