import type React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"

interface StatsCardProps {
  title: string
  value: string
  change: string
  icon: React.ReactNode
  trend: "up" | "down" | "stable"
}

export default function StatsCard({ title, value, change, icon, trend }: StatsCardProps) {
  const trendColor = trend === "up" ? "text-primary" : trend === "down" ? "text-secondary" : "text-accent"
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : null

  return (
    <Card className="glass glow-green hover:glow-cyan transition-all">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
          </div>
          <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg flex items-center justify-center text-primary">
            {icon}
          </div>
        </div>
        <div className={`mt-4 flex items-center gap-1 text-sm ${trendColor}`}>
          {TrendIcon && <TrendIcon className="h-4 w-4" />}
          <span>{change}</span>
        </div>
      </CardContent>
    </Card>
  )
}
