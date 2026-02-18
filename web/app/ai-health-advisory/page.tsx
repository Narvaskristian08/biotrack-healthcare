'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Lightbulb, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import DashboardLayout from '@/components/dashboard-layout';
import { PatientPageContentSkeleton } from '@/components/patient-page-skeleton';
import { fetchMyAlerts, fetchMyHealthSummary, fetchMyTrendInsight } from '@/lib/patient-role';

export default function AIHealthAdvisoryPage() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState('');
  const [summaryObservations, setSummaryObservations] = useState<string[]>([]);
  const [riskLevel, setRiskLevel] = useState('LOW');
  const [fallEvents, setFallEvents] = useState(0);
  const [trend, setTrend] = useState('INSUFFICIENT_DATA');
  const [trendInsight, setTrendInsight] = useState('');
  const [alerts, setAlerts] = useState<{ id: string; type: string; severity: string; message: string }[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const [summaryRes, trendRes, alertsRes] = await Promise.all([fetchMyHealthSummary(7), fetchMyTrendInsight(), fetchMyAlerts(10)]);
      if (!active) return;
      const nextErrors: string[] = [];

      if (summaryRes.error) {
        nextErrors.push(`Summary endpoint: ${summaryRes.error}`);
      } else {
        setSummary(summaryRes.data?.insight ?? '');
        setSummaryObservations(summaryRes.data?.summaryData?.observations ?? []);
        setRiskLevel(summaryRes.data?.summaryData?.overallRisk ?? 'LOW');
        setFallEvents(Number(summaryRes.data?.summaryData?.fallEvents ?? 0));
      }

      if (trendRes.error) {
        nextErrors.push(`Trend endpoint: ${trendRes.error}`);
      } else {
        setTrend(trendRes.data?.trendData?.trend ?? 'INSUFFICIENT_DATA');
        setTrendInsight(trendRes.data?.insight ?? '');
      }

      if (alertsRes.error) {
        nextErrors.push(`Alerts endpoint: ${alertsRes.error}`);
      } else {
        setAlerts((alertsRes.alerts ?? []).map((a) => ({ id: a._id, type: a.type, severity: a.severity, message: a.message })));
      }

      setErrors(nextErrors);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <PatientPageContentSkeleton stats={3} chartCards={2} listCards={1} listRows={4} footerNotice />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-5xl">
        <header className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">AI Health Advisory</h1>
          <p className="text-muted-foreground text-sm sm:text-base">AI-generated advisory summaries from your health data</p>
        </header>

        {errors.length > 0 ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">
              <p>Some AI data could not be loaded:</p>
              <ul className="mt-2 list-disc pl-5">
                {errors.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                <Lightbulb className="h-5 w-5" />
                Risk Level
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{riskLevel}</p>
              <p className="text-xs text-muted-foreground mt-1">Fall events: {fallEvents}</p>
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
              <TrendingUp className="h-5 w-5" />
              Trend Interpretation
            </CardTitle>
            <CardDescription>AI interpretation returned by the trend endpoint</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{trendInsight || 'No trend interpretation available yet.'}</p>
          </CardContent>
        </Card>

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
            {summaryObservations.length > 0 ? (
              <ul className="mt-3 list-disc pl-5 text-sm text-muted-foreground space-y-1">
                {summaryObservations.map((observation) => (
                  <li key={observation}>{observation}</li>
                ))}
              </ul>
            ) : null}
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
