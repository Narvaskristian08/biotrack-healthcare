'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Heart, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import DashboardLayout from '@/components/dashboard-layout';
import { PatientPageContentSkeleton } from '@/components/patient-page-skeleton';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { fetchMyAlerts, fetchMyTrendInsight } from '@/lib/patient-role';

export default function HealthMonitoringPage() {
  const [heartRates, setHeartRates] = useState<number[]>([]);
  const [trend, setTrend] = useState('INSUFFICIENT_DATA');
  const [alerts, setAlerts] = useState<{ id: string; message: string; severity: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [trendRes, alertsRes] = await Promise.all([fetchMyTrendInsight(), fetchMyAlerts(10)]);
        if (!active) return;
        if (trendRes.error) {
          setError(trendRes.error);
        } else {
          setHeartRates(trendRes.data?.trendData?.recentHeartRates ?? []);
          setTrend(trendRes.data?.trendData?.trend ?? 'INSUFFICIENT_DATA');
        }
        if (!alertsRes.error) {
          setAlerts((alertsRes.alerts ?? []).map((a) => ({ id: a._id, message: a.message, severity: a.severity })));
        }
      } catch (fetchError) {
        if (!active) return;
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load monitoring data.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const chartData = useMemo(
    () => heartRates.map((value, idx) => ({ time: `#${idx + 1}`, heartRate: value })),
    [heartRates]
  );

  if (loading) {
    return (
      <DashboardLayout>
        <PatientPageContentSkeleton stats={3} chartCards={1} listCards={1} listRows={4} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-5xl">
        <header className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Health Monitoring</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Real-time monitoring and alert overview</p>
        </header>

        {error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Latest heart rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{heartRates.length > 0 ? heartRates[heartRates.length - 1] : 'N/A'} bpm</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{trend}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{alerts.length}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your heart-rate trend</CardTitle>
            <CardDescription>Based on latest available monitored samples</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="time" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip contentStyle={{ borderRadius: 'var(--radius)', border: '1px solid var(--border)' }} />
                  <Legend />
                  <Line type="monotone" dataKey="heartRate" name="Heart rate (bpm)" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Alert log
            </CardTitle>
            <CardDescription>Detected alert events associated with your records</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {alerts.map((alert) => (
                <li key={alert.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span className="text-sm">
                    [{alert.severity}] {alert.message || 'No message'}
                  </span>
                </li>
              ))}
              {alerts.length === 0 ? <li className="text-sm text-muted-foreground">No alerts found.</li> : null}
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
