'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, FileText, HeartPulse, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import DashboardLayout from '@/components/dashboard-layout';
import { PatientPageContentSkeleton } from '@/components/patient-page-skeleton';
import { downloadTextFile, fetchMyAiInsights, fetchMyPatientRecords, type PatientRecord } from '@/lib/patient-role';

type HeartRatePoint = {
  label: string;
  value: number;
  recordedAt: string;
};

function toObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function extractHeartRate(record: PatientRecord): number | null {
  const data = toObject(record.data);
  const metrics = toObject(data.metrics);
  return toNumber(data.heartRate) ?? toNumber(data.bpm) ?? toNumber(metrics.heartRate) ?? toNumber(metrics.bpm);
}

function formatRecordType(type: string) {
  const normalized = String(type ?? '').trim().toLowerCase();
  if (!normalized) return 'Health record';
  return normalized.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildHeartRatePoints(records: PatientRecord[]): HeartRatePoint[] {
  const sorted = [...records].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  let sequence = 0;
  return sorted.flatMap((record) => {
    const heartRate = extractHeartRate(record);
    if (heartRate === null) return [];
    sequence += 1;
    return [
      {
        label: `#${sequence}`,
        value: heartRate,
        recordedAt: record.createdAt,
      },
    ];
  });
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatBpm(value: number | null) {
  if (value === null) return 'N/A';
  return `${Math.round(value)} bpm`;
}

function simplifyAiSummary(input: string): string[] {
  const cleaned = String(input ?? '')
    .replace(/\s+/g, ' ')
    .replace(/Health Summary Report/gi, '')
    .replace(/Health Trend Insight/gi, '')
    .trim();

  if (!cleaned) return [];

  return cleaned
    .replace(/\s+-\s+/g, '. ')
    .split(/(?<=[.!?])\s+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function buildFriendlyInsights(points: HeartRatePoint[], totalRecords: number, verifiedRecords: number): string[] {
  if (totalRecords === 0) {
    return [
      'No health records were found for this period.',
      'Start monitoring to generate a chart and a clearer weekly health interpretation.',
    ];
  }

  const values = points.map((point) => point.value);
  const latest = values.length > 0 ? values[values.length - 1] : null;
  const avg = average(values);
  const min = values.length > 0 ? Math.min(...values) : null;
  const max = values.length > 0 ? Math.max(...values) : null;

  const lines = [`This report includes ${totalRecords} health record(s).`];

  if (latest !== null && avg !== null) {
    lines.push(`Your latest heart rate is ${Math.round(latest)} bpm, with an average of ${Math.round(avg)} bpm.`);
  } else {
    lines.push('No heart-rate readings were found in these records.');
  }

  if (min !== null && max !== null) {
    lines.push(`Your recorded heart-rate range is ${Math.round(min)} to ${Math.round(max)} bpm.`);
  }

  if (latest !== null) {
    if (latest >= 120) {
      lines.push('Your latest reading is high. Consider resting and contacting your provider for guidance.');
    } else if (latest >= 100) {
      lines.push('Your latest reading is slightly elevated. Continue monitoring and compare with your usual baseline.');
    } else if (latest < 60) {
      lines.push('Your latest reading is below the usual resting range. Seek advice if you feel symptoms.');
    } else {
      lines.push('Your latest reading is within a common resting range.');
    }
  }

  lines.push(`${verifiedRecords} record(s) passed authenticity checks through blockchain verification.`);
  return lines;
}

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

function wrapLine(line: string, maxChars = 92): string[] {
  const normalized = String(line ?? '').trim();
  if (!normalized) return [''];
  if (normalized.length <= maxChars) return [normalized];

  const words = normalized.split(/\s+/);
  const wrapped: string[] = [];
  let current = '';

  words.forEach((word) => {
    if (!current) {
      current = word;
      return;
    }
    if (current.length + word.length + 1 <= maxChars) {
      current += ` ${word}`;
      return;
    }
    wrapped.push(current);
    current = word;
  });

  if (current) wrapped.push(current);
  return wrapped.length > 0 ? wrapped : [''];
}

function escapePdfText(input: string): string {
  return String(input ?? '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function buildTextCommands(lines: string[], x: number, startY: number, lineHeight = 14, fontSize = 11): string[] {
  const commands = ['BT', `/F1 ${fontSize} Tf`];
  lines.forEach((line, index) => {
    const y = startY - index * lineHeight;
    commands.push(`1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${escapePdfText(line)}) Tj`);
  });
  commands.push('ET');
  return commands;
}

function buildChartCommands(points: HeartRatePoint[], x: number, y: number, width: number, height: number) {
  const commands: string[] = [];
  const values = points.map((point) => point.value);

  const minRaw = values.length > 0 ? Math.min(...values) : 50;
  const maxRaw = values.length > 0 ? Math.max(...values) : 120;
  let minValue = minRaw;
  let maxValue = maxRaw;
  if (minValue === maxValue) {
    minValue -= 5;
    maxValue += 5;
  }

  commands.push('0.90 0.90 0.90 RG 0.5 w');
  for (let step = 0; step <= 4; step += 1) {
    const yLine = y + (height / 4) * step;
    commands.push(`${x.toFixed(2)} ${yLine.toFixed(2)} m ${(x + width).toFixed(2)} ${yLine.toFixed(2)} l S`);
  }

  commands.push('0.25 0.25 0.25 RG 1 w');
  commands.push(`${x.toFixed(2)} ${y.toFixed(2)} m ${x.toFixed(2)} ${(y + height).toFixed(2)} l S`);
  commands.push(`${x.toFixed(2)} ${y.toFixed(2)} m ${(x + width).toFixed(2)} ${y.toFixed(2)} l S`);

  if (points.length > 0) {
    const mapX = (index: number) =>
      points.length === 1 ? x + width / 2 : x + (index / (points.length - 1)) * width;
    const mapY = (value: number) => y + ((value - minValue) / (maxValue - minValue)) * height;

    commands.push('0.16 0.56 0.28 RG 2 w');
    points.forEach((point, index) => {
      const px = mapX(index);
      const py = mapY(point.value);
      if (index === 0) {
        commands.push(`${px.toFixed(2)} ${py.toFixed(2)} m`);
      } else {
        commands.push(`${px.toFixed(2)} ${py.toFixed(2)} l`);
      }
    });
    commands.push('S');

    commands.push('0.16 0.56 0.28 rg');
    points.forEach((point, index) => {
      const px = mapX(index);
      const py = mapY(point.value);
      commands.push(`${(px - 1.7).toFixed(2)} ${(py - 1.7).toFixed(2)} 3.4 3.4 re f`);
    });
  }

  const latest = points.length > 0 ? points[points.length - 1].value : null;
  const legendLines =
    points.length === 0
      ? ['No heart-rate values available for charting yet.']
      : [
          `Heart-rate chart range: ${Math.round(minRaw)} to ${Math.round(maxRaw)} bpm`,
          `Latest charted value: ${latest !== null ? `${Math.round(latest)} bpm` : 'N/A'}`,
          `Data points plotted: ${points.length}`,
        ];

  return { commands, legendLines };
}

function downloadPdfFile(filename: string, reportLines: string[], chartPoints: HeartRatePoint[]) {
  if (typeof window === 'undefined') return;

  const encoder = new TextEncoder();
  const normalizedLines = reportLines.flatMap((line) => wrapLine(String(line ?? ''), 88));

  const firstPageTopCount = 8;
  const firstPageBottomCount = 20;
  const topLines = normalizedLines.slice(0, firstPageTopCount);
  const remainingAfterTop = normalizedLines.slice(firstPageTopCount);
  const bottomLines = remainingAfterTop.slice(0, firstPageBottomCount);
  const remaining = remainingAfterTop.slice(firstPageBottomCount);

  const pageStreams: string[] = [];
  const chartX = 60;
  const chartY = 470;
  const chartWidth = 475;
  const chartHeight = 165;

  const firstPageCommands: string[] = [];
  firstPageCommands.push(...buildTextCommands(topLines, 50, 804, 15, 12));
  firstPageCommands.push(...buildTextCommands(['Heart-Rate Trend'], 50, 670, 14, 12));
  const chart = buildChartCommands(chartPoints, chartX, chartY, chartWidth, chartHeight);
  firstPageCommands.push(...chart.commands);
  firstPageCommands.push(...buildTextCommands(chart.legendLines, 60, 450, 13, 10));
  if (bottomLines.length > 0) {
    firstPageCommands.push(...buildTextCommands(bottomLines, 50, 392, 13, 10));
  }
  pageStreams.push(firstPageCommands.join('\n'));

  const linesPerPage = 48;
  for (let index = 0; index < remaining.length; index += linesPerPage) {
    const chunk = remaining.slice(index, index + linesPerPage);
    pageStreams.push(buildTextCommands(chunk, 50, 804, 15, 11).join('\n'));
  }

  const objects: string[] = ['', '', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  const pageRefs: string[] = [];

  pageStreams.forEach((stream) => {
    objects.push(`<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}\nendstream`);
    const contentObjectNumber = objects.length;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`
    );
    pageRefs.push(`${objects.length} 0 R`);
  });

  objects[1] = `<< /Type /Pages /Count ${pageRefs.length} /Kids [${pageRefs.join(' ')}] >>`;
  objects[0] = '<< /Type /Catalog /Pages 2 0 R >>';

  let pdf = '%PDF-1.4\n';
  let offset = encoder.encode(pdf).length;
  const offsets: number[] = [0];

  objects.forEach((objectBody, index) => {
    offsets.push(offset);
    const chunk = `${index + 1} 0 obj\n${objectBody}\nendobj\n`;
    pdf += chunk;
    offset += encoder.encode(chunk).length;
  });

  const xrefOffset = offset;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((entryOffset) => {
    xref += `${String(entryOffset).padStart(10, '0')} 00000 n \n`;
  });

  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  const blob = new Blob([pdf + xref + trailer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function buildPdfReportLines(
  records: PatientRecord[],
  summary: string,
  totalVerified: number,
  heartRatePoints: HeartRatePoint[]
): string[] {
  const aiSummaryLines = simplifyAiSummary(summary);
  const friendlyInsights = buildFriendlyInsights(heartRatePoints, records.length, totalVerified);
  const latestHeartRate = heartRatePoints.length > 0 ? heartRatePoints[heartRatePoints.length - 1].value : null;

  const lines: string[] = [
    'BioTrack Patient Health Report',
    `Generated At: ${new Date().toLocaleString()}`,
    `Total Records: ${records.length}`,
    `Latest Heart Rate: ${formatBpm(latestHeartRate)}`,
    '',
    'What this report means',
    ...friendlyInsights.map((line) => `- ${line}`),
  ];

  if (aiSummaryLines.length > 0) {
    lines.push('', 'AI advisory (simplified)');
    aiSummaryLines.forEach((line) => lines.push(`- ${line}`));
  }

  lines.push('', 'Recent health records');
  const latestRecords = [...records].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 12);
  if (latestRecords.length === 0) {
    lines.push('- No records available yet.');
  } else {
    latestRecords.forEach((record, index) => {
      lines.push(
        `- ${index + 1}. ${new Date(record.createdAt).toLocaleString()} | ${formatRecordType(record.type)}`
      );
    });
  }

  lines.push('', 'Reminder: This report supports monitoring and does not replace professional medical diagnosis.');
  return lines;
}

export default function ReportsDownloadsPage() {
  const [records, setRecords] = useState<PatientRecord[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      const [recordsRes, insightsRes] = await Promise.all([fetchMyPatientRecords(), fetchMyAiInsights(1)]);
      if (!active) return;
      setLoading(false);
      if (recordsRes.error) {
        setError(recordsRes.error);
        return;
      }
      setRecords(recordsRes.records ?? []);
      if (insightsRes.error) {
        setSummary('');
        return;
      }
      const latestInsight = (insightsRes.insights ?? [])[0] ?? null;
      setSummary(String(latestInsight?.text ?? '').trim());
    })();
    return () => {
      active = false;
    };
  }, []);

  const totalVerified = useMemo(
    () => records.filter((record) => String(record.blockchain?.verificationStatus ?? '').toLowerCase() === 'anchored').length,
    [records]
  );
  const heartRatePoints = useMemo(() => buildHeartRatePoints(records), [records]);
  const latestHeartRate = heartRatePoints.length > 0 ? heartRatePoints[heartRatePoints.length - 1].value : null;
  const friendlyInsights = useMemo(
    () => buildFriendlyInsights(heartRatePoints, records.length, totalVerified),
    [heartRatePoints, records.length, totalVerified]
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
    downloadTextFile(
      `patient-report-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(payload, null, 2),
      'application/json;charset=utf-8'
    );
  };

  const downloadSummaryTxt = () => {
    const lines = [
      `Generated At: ${new Date().toISOString()}`,
      `Total Records: ${records.length}`,
      `Latest Heart Rate: ${formatBpm(latestHeartRate)}`,
      '',
      'Patient-Friendly Notes',
      ...friendlyInsights.map((line) => `- ${line}`),
    ];
    downloadTextFile(`health-summary-${new Date().toISOString().slice(0, 10)}.txt`, lines.join('\n'));
  };

  const downloadPdf = () => {
    const lines = buildPdfReportLines(records, summary, totalVerified, heartRatePoints);
    downloadPdfFile(`patient-report-${new Date().toISOString().slice(0, 10)}.pdf`, lines, heartRatePoints);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <PatientPageContentSkeleton stats={3} chartCards={0} listCards={0} actionButtons={4} footerNotice />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-5xl">
        <header className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Reports & Downloads</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Download easy-to-read health reports with clear explanations and chart-based trends.
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
              <p className="text-xs text-muted-foreground mt-1">Included in report output</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Latest Heart Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatBpm(latestHeartRate)}</div>
              <p className="text-xs text-muted-foreground mt-1">{heartRatePoints.length} charted reading(s)</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Export Formats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">4</div>
              <p className="text-xs text-muted-foreground mt-1">PDF, TXT, CSV, JSON</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              What your report highlights
            </CardTitle>
            <CardDescription>A non-technical summary you can understand quickly.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 text-sm text-foreground/90 space-y-1">
              {friendlyInsights.map((line, index) => (
                <li key={`${line}-${index}`}>{line}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Downloadable Health Reports
            </CardTitle>
            <CardDescription>Export your own data only (patient-scoped access)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full gap-2" onClick={downloadPdf} disabled={loading}>
              <HeartPulse className="h-4 w-4" />
              Download Patient-Friendly Report (PDF with chart)
            </Button>
            <Button variant="outline" className="w-full gap-2" onClick={downloadSummaryTxt} disabled={loading}>
              <Download className="h-4 w-4" />
              Download Health Summary (TXT)
            </Button>
            <Button variant="outline" className="w-full gap-2" onClick={downloadCsv} disabled={loading}>
              <Download className="h-4 w-4" />
              Download Medical History (CSV)
            </Button>
            <Button variant="outline" className="w-full gap-2" onClick={downloadJson} disabled={loading}>
              <Download className="h-4 w-4" />
              Download Full Data (JSON - technical)
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
