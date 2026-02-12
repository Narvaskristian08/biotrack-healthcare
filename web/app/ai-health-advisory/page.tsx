'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Lightbulb, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import DashboardLayout from '@/components/dashboard-layout';
import { fetchMyAlerts, fetchMyHealthSummary, fetchMyTrendInsight } from '@/lib/patient-role';

export default function AIHealthAdvisoryPage() {
  const [summary, setSummary] = useState('');
  const [trend, setTrend] = useState('INSUFFICIENT_DATA');
  const [alerts, setAlerts] = useState<{ id: string; type: string; severity: string; message: string }[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const [summaryRes, trendRes, alertsRes] = await Promise.all([fetchMyHealthSummary(7), fetchMyTrendInsight(), fetchMyAlerts(10)]);
      if (!active) return;
      if (summaryRes.error) {
        setError(summaryRes.error);
      } else {
        setSummary(summaryRes.data?.insight ?? '');
      }
      if (!trendRes.error) {
        setTrend(trendRes.data?.trendData?.trend ?? 'INSUFFICIENT_DATA');
      }
      if (!alertsRes.error) {
        setAlerts((alertsRes.alerts ?? []).map((a) => ({ id: a._id, type: a.type, severity: a.severity, message: a.message })));
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-5xl">
        <header className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">AI Health Advisory</h1>
          <p className="text-muted-foreground text-sm sm:text-base">AI-generated advisory summaries from your health data</p>
        </header>

        {error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Current Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{trend}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Alert Count
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{alerts.length}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              AI Summary
            </CardTitle>
            <CardDescription>Advisory output from summary analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{summary || 'No advisory summary available yet.'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Advisory Alerts</CardTitle>
            <CardDescription>Risk and event notices generated for your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="p-3 rounded-lg border border-border">
                <div className="flex items-start gap-2">
                  <Badge variant={alert.severity === 'HIGH' || alert.severity === 'CRITICAL' ? 'destructive' : 'secondary'}>
                    {alert.severity}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium">{alert.type.replaceAll('_', ' ')}</p>
                    <p className="text-xs text-muted-foreground mt-1">{alert.message || 'No message.'}</p>
                  </div>
                </div>
              </div>
            ))}
            {alerts.length === 0 ? <p className="text-sm text-muted-foreground">No advisory alerts available.</p> : null}
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <CardTitle className="text-base">Medical Disclaimer</CardTitle>
                <CardDescription className="mt-2">
                  AI insights are advisory only and should not replace professional medical evaluation.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    </DashboardLayout>
  );
}
