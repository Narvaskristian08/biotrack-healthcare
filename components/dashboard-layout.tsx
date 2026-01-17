"use client"

import type React from "react"

import { useState } from "react"
import { Menu, X, LogOut, Settings, Home, Users, BarChart3, Lock, FileText, Heart, ChevronDown } from "lucide-react"
import Link from "next/link"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex h-screen bg-background">
      <aside
        className={`${sidebarOpen ? "w-64" : "w-20"} border-r border-border bg-white/40 backdrop-blur-sm transition-all duration-300 flex flex-col`}
      >
        {/* Logo Section */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-md">
              <Heart className="h-6 w-6 text-white" />
            </div>
            {sidebarOpen && (
              <div className="flex-1">
                <span className="font-bold text-lg bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  BioTrack
                </span>
                <p className="text-xs text-muted-foreground">Healthcare</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <NavItem icon={<Home className="h-5 w-5" />} label="Dashboard" href="/" active sidebarOpen={sidebarOpen} />
          <NavItem icon={<Users className="h-5 w-5" />} label="Users" href="/users" sidebarOpen={sidebarOpen} />
          <NavItem
            icon={<BarChart3 className="h-5 w-5" />}
            label="Analytics"
            href="/analytics"
            sidebarOpen={sidebarOpen}
          />
          <NavItem icon={<FileText className="h-5 w-5" />} label="Records" href="/records" sidebarOpen={sidebarOpen} />
          <NavItem
            icon={<Lock className="h-5 w-5" />}
            label="Blockchain"
            href="/blockchain"
            sidebarOpen={sidebarOpen}
          />
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border space-y-2">
          <NavItem
            icon={<Settings className="h-5 w-5" />}
            label="Settings"
            href="/settings"
            sidebarOpen={sidebarOpen}
          />
          <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-foreground hover:bg-primary/10 rounded-lg transition-colors">
            <LogOut className="h-5 w-5" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="border-b border-border bg-white/50 backdrop-blur-md sticky top-0 z-40">
          <div className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-primary/10 rounded-lg transition-colors text-foreground"
              >
                {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <div className="h-8 w-px bg-border" />
              <h1 className="text-lg font-semibold text-foreground">Dashboard</h1>
            </div>
            <div className="flex items-center gap-4">
              {/* Quick Stats */}
              <div className="hidden md:flex items-center gap-6 px-4 py-2 bg-green-50 rounded-lg">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Active Users</p>
                  <p className="text-sm font-semibold text-foreground">248</p>
                </div>
                <div className="h-6 w-px bg-border" />
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="text-sm font-semibold text-green-600">Live</p>
                </div>
              </div>

              {/* User Profile */}
              <button className="flex items-center gap-3 px-3 py-2 hover:bg-muted rounded-lg transition-colors">
                <div className="w-9 h-9 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary">HW</span>
                </div>
                <div className="hidden sm:flex flex-col items-start">
                  <span className="text-sm font-medium text-foreground">Health Worker</span>
                  <span className="text-xs text-muted-foreground">Online</span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6 bg-gradient-to-br from-green-50 to-blue-50">{children}</main>
      </div>
    </div>
  )
}

interface NavItemProps {
  icon: React.ReactNode
  label: string
  href: string
  active?: boolean
  sidebarOpen: boolean
}

function NavItem({ icon, label, href, active, sidebarOpen }: NavItemProps) {
  return (
    <Link href={href}>
      <button
        className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
          active
            ? "bg-gradient-to-r from-primary/20 to-accent/20 text-primary font-semibold shadow-sm"
            : "text-foreground hover:bg-primary/10"
        }`}
      >
        {icon}
        {sidebarOpen && <span>{label}</span>}
      </button>
    </Link>
  )
}
