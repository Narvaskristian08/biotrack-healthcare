import type React from "react"
import type { Metadata } from "next"
import { Inter, Poppins } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { DashboardRoleProvider } from "@/hooks/use-dashboard-role"
import "./globals.css"
import PolicyModal from '@/components/policy-modal'

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-poppins" })

export const metadata: Metadata = {
  title: "BioTrack - Healthcare Platform",
  description: "Smart IoT Vital Sensing and AI Health Advisory Platform",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${poppins.variable} font-sans antialiased`}>
        <DashboardRoleProvider>
          {children}
          <PolicyModal />
        </DashboardRoleProvider>
        <Analytics />
      </body>
    </html>
  )
}
