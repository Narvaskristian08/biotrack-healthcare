import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronRight, Heart, TrendingUp, TrendingDown } from "lucide-react"

export default function UsersList() {
  const users = [
    { id: 1, name: "Maria Santos", age: 65, status: "Normal", lastUpdate: "2 min ago", bpm: 72, trend: "stable" },
    { id: 2, name: "John Doe", age: 58, status: "Alert", lastUpdate: "5 min ago", bpm: 98, trend: "up" },
    { id: 3, name: "Ana Cruz", age: 72, status: "Normal", lastUpdate: "1 min ago", bpm: 68, trend: "down" },
    { id: 4, name: "Roberto Silva", age: 61, status: "Normal", lastUpdate: "3 min ago", bpm: 75, trend: "stable" },
  ]

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-white/10">
          <tr className="text-left">
            <th className="pb-3 font-semibold text-muted-foreground">Name</th>
            <th className="pb-3 font-semibold text-muted-foreground">Age</th>
            <th className="pb-3 font-semibold text-muted-foreground">Heart Rate</th>
            <th className="pb-3 font-semibold text-muted-foreground">Status</th>
            <th className="pb-3 font-semibold text-muted-foreground">Last Update</th>
            <th className="pb-3 font-semibold text-muted-foreground"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-white/5 transition-colors group">
              <td className="py-4 font-medium text-foreground">{user.name}</td>
              <td className="py-4 text-muted-foreground">{user.age}</td>
              <td className="py-4">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-foreground">{user.bpm}</span>
                  <span className="text-muted-foreground text-xs">bpm</span>
                  {user.trend === "up" && <TrendingUp className="h-3 w-3 text-orange-400" />}
                  {user.trend === "down" && <TrendingDown className="h-3 w-3 text-primary" />}
                </div>
              </td>
              <td className="py-4">
                <Badge
                  variant={user.status === "Alert" ? "destructive" : "default"}
                  className={`${user.status === "Alert" ? "bg-destructive/20 text-destructive" : "bg-primary/20 text-primary"
                    }`}
                >
                  {user.status}
                </Badge>
              </td>
              <td className="py-4 text-muted-foreground text-xs">{user.lastUpdate}</td>
              <td className="py-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary hover:bg-primary/20 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
