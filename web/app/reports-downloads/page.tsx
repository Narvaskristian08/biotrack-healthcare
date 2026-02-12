'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/dashboard-layout';
import { downloadTextFile, fetchMyHealthSummary, fetchMyPatientRecords, type PatientRecord } from '@/lib/patient-role';

function recordsToCsv(records: PatientRecord[]): string {
  const header = ['recordId', 'type', 'createdAt', 'recordHash', 'blockchainStatus', 'txId', 'dataJson'];
  const lines = records.map((record) =>
    [
      record._id,
      record.type,
      record.createdAt,
      record.recordHash,
      record.blockchain?.verificationStatus ?? '',
      record.blockchain?.txId ?? '',
      JSON.stringify(record.data ?? {}).replaceAll('"', '""'),
    ]
      .map((value) => `"${String(value)}"`)
      .join(',')
  );
  return [header.join(','), ...lines].join('\n');
}

export default function ReportsDownloadsPage() {
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const [recordsRes, summaryRes] = await Promise.all([fetchMyPatientRecords(), fetchMyHealthSummary(30)]);
      if (!active) return;
      setLoading(false);
      if (recordsRes.error) {
        setError(recordsRes.error);
        return;
      }
      setRecords(recordsRes.records ?? []);
      setSummary(summaryRes.data?.insight ?? '');
    })();
    return () => {
      active = false;
    };
  }, []);

  const totalVerified = useMemo(
    () => records.filter((record) => String(record.blockchain?.verificationStatus ?? '').toLowerCase() === 'anchored').length,
    [records]
  );

  const downloadCsv = () => {
    const content = recordsToCsv(records);
    downloadTextFile(`patient-records-${new Date().toISOString().slice(0, 10)}.csv`, content, 'text/csv;charset=utf-8');
  };

  const downloadJson = () => {
    const payload = {
      generatedAt: new Date().toISOString(),
      totalRecords: records.length,
      verifiedRecords: totalVerified,
      summary,
      records,
    };
    downloadTextFile(`patient-report-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
  };

  const downloadSummaryTxt = () => {
    const lines = [
      `Generated At: ${new Date().toISOString()}`,
      `Total Records: ${records.length}`,
      `Verified Records: ${totalVerified}`,
      '',
      'AI Advisory Summary',
      summary || 'No summary available.',
    ];
    downloadTextFile(`health-summary-${new Date().toISOString().slice(0, 10)}.txt`, lines.join('\n'));
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-5xl">
        <header className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Reports & Downloads</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Download your personal health reports, historical records, and advisory summaries
          </p>
        </header>

        {error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : null}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{records.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Blockchain Verified</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{totalVerified}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Export Formats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">3</div>
              <p className="text-xs text-muted-foreground mt-1">CSV, JSON, TXT</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Downloadable Health Reports
            </CardTitle>
            <CardDescription>Export your own data only (patient-scoped access)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full gap-2" onClick={downloadSummaryTxt} disabled={loading}>
              <Download className="h-4 w-4" />
              Download AI Health Summary (TXT)
            </Button>
            <Button variant="outline" className="w-full gap-2" onClick={downloadCsv} disabled={loading}>
              <Download className="h-4 w-4" />
              Download Medical History (CSV)
            </Button>
            <Button variant="outline" className="w-full gap-2" onClick={downloadJson} disabled={loading}>
              <Download className="h-4 w-4" />
              Download Full Report (JSON)
            </Button>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Privacy and Access Control</CardTitle>
            <CardDescription>
              Exports are generated from your patient-scoped session only. No other patients&apos; records are included.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </DashboardLayout>
  );
}
