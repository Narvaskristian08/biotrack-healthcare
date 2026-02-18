'use client';

import { useEffect, useMemo, useState } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import DashboardLayout from '@/components/dashboard-layout';
import { PatientPageContentSkeleton } from '@/components/patient-page-skeleton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { fetchMyTrendInsight } from '@/lib/patient-role';

type Range = 'daily' | 'weekly' | 'monthly';

export default function VitalsHistoryPage() {
  const [timeRange, setTimeRange] = useState<Range>('weekly');
  const [loading, setLoading] = useState(true);
  const [heartRates, setHeartRates] = useState<number[]>([]);
  const [trend, setTrend] = useState('INSUFFICIENT_DATA');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const result = await fetchMyTrendInsight();
        if (!active) return;
        if (result.error) {
          setError(result.error);
          return;
        }
        setHeartRates(result.data?.trendData?.recentHeartRates ?? []);
        setTrend(result.data?.trendData?.trend ?? 'INSUFFICIENT_DATA');
      } catch (fetchError) {
        if (!active) return;
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load vitals data.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [timeRange]);

  const chartData = useMemo(() => heartRates.map((value, idx) => ({ sample: `${idx + 1}`, heartRate: value })), [heartRates]);
  const current = heartRates.length > 0 ? heartRates[heartRates.length - 1] : null;
  const average = heartRates.length > 0 ? heartRates.reduce((a, b) => a + b, 0) / heartRates.length : null;
  const min = heartRates.length > 0 ? Math.min(...heartRates) : null;
  const max = heartRates.length > 0 ? Math.max(...heartRates) : null;

  if (loading) {
    return (
      <DashboardLayout>
        <PatientPageContentSkeleton stats={0} controls={3} chartCards={1} listCards={1} listRows={4} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-5xl">
        <header className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Vitals History</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Historical heart-rate trend and summary metrics</p>
        </header>

        {error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button variant={timeRange === 'daily' ? 'default' : 'outline'} size="sm" onClick={() => setTimeRange('daily')}>
            Daily
          </Button>
          <Button variant={timeRange === 'weekly' ? 'default' : 'outline'} size="sm" onClick={() => setTimeRange('weekly')}>
            Weekly
          </Button>
          <Button variant={timeRange === 'monthly' ? 'default' : 'outline'} size="sm" onClick={() => setTimeRange('monthly')}>
            Monthly
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Heart Rate Overview</CardTitle>
            <CardDescription>Trend: {trend}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="sample" className="text-xs" />
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
              <Heart className="h-5 w-5" />
              Vital Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground">Current</p>
                <p className="text-lg font-bold">{current ?? 'N/A'}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground">Average</p>
                <p className="text-lg font-bold">{average !== null ? average.toFixed(1) : 'N/A'}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground">Min</p>
                <p className="text-lg font-bold">{min ?? 'N/A'}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground">Max</p>
                <p className="text-lg font-bold">{max ?? 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
