import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"

const data = [
  { day: "Mon", hr: 72, bp: 120, temp: 98.6 },
  { day: "Tue", hr: 68, bp: 118, temp: 98.5 },
  { day: "Wed", hr: 75, bp: 122, temp: 98.7 },
  { day: "Thu", hr: 70, bp: 119, temp: 98.6 },
  { day: "Fri", hr: 78, bp: 124, temp: 98.8 },
  { day: "Sat", hr: 74, bp: 121, temp: 98.6 },
  { day: "Sun", hr: 71, bp: 120, temp: 98.5 },
]

export default function VitalsChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        <XAxis dataKey="day" stroke="var(--muted-foreground)" />
        <YAxis stroke="var(--muted-foreground)" />
        <Tooltip
          contentStyle={{
            backgroundColor: "rgba(15, 23, 42, 0.8)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "0.875rem",
          }}
          cursor={{ stroke: "rgba(255, 255, 255, 0.2)" }}
        />
        <Line
          type="monotone"
          dataKey="hr"
          stroke="var(--chart-1)"
          name="Heart Rate (bpm)"
          strokeWidth={2}
          dot={{ fill: "var(--chart-1)", r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
