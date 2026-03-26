import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Activity, Heart } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function AlertsPanel() {
  const alerts = [
    {
      id: 1,
      type: "high-bp",
      patient: "Maria Santos",
      value: "145/92 mmHg",
      severity: "high",
      icon: <Heart className="h-4 w-4" />,
    },
    {
      id: 2,
      type: "fall",
      patient: "John Doe",
      value: "Fall detected",
      severity: "critical",
      icon: <AlertCircle className="h-4 w-4" />,
    },
    {
      id: 3,
      type: "low-activity",
      patient: "Ana Cruz",
      value: "No activity for 2h",
      severity: "medium",
      icon: <Activity className="h-4 w-4" />,
    },
  ]

  return (
    <Card className="glass glow-cyan">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          Recent Alerts
        </CardTitle>
        <CardDescription>Requires immediate attention</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="flex items-start gap-3 p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all cursor-pointer group"
          >
            <div
              className={`p-2 rounded-lg transition-colors ${alert.severity === "critical"
                  ? "bg-destructive/20 text-destructive group-hover:bg-destructive/30"
                  : alert.severity === "high"
                    ? "bg-orange-500/20 text-orange-400 group-hover:bg-orange-500/30"
                    : "bg-yellow-500/20 text-yellow-400 group-hover:bg-yellow-500/30"
                }`}
            >
              {alert.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{alert.patient}</p>
              <p className="text-xs text-muted-foreground">{alert.value}</p>
            </div>
            <Badge
              variant={alert.severity === "critical" ? "destructive" : "secondary"}
              className={`text-xs shrink-0 ${alert.severity === "critical"
                  ? "bg-destructive/20 text-destructive"
                  : alert.severity === "high"
                    ? "bg-orange-500/20 text-orange-400"
                    : "bg-yellow-500/20 text-yellow-400"
                }`}
            >
              {alert.severity}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
