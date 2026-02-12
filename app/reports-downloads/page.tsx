'use client'

import { Download, File, FileText, Share2, Filter, Calendar } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import DashboardLayout from '@/components/dashboard-layout'

interface Report {
  id: string
  title: string
  type: 'pdf' | 'csv' | 'json'
  date: string
  size: string
  fileSize: number
  lastGenerated: string
  description: string
  dataIncluded: string[]
}

export default function ReportsDownloadsPage() {
  const reports: Report[] = [
    {
      id: '1',
      title: 'Monthly Health Summary - January 2026',
      type: 'pdf',
      date: '2026-01-30',
      size: '2.4 MB',
      fileSize: 2400,
      lastGenerated: '2 hours ago',
      description: 'Comprehensive overview of your health metrics, trends, and recommendations for January.',
      dataIncluded: ['Vital signs summary', 'Health trends', 'AI recommendations', 'Activity logs', 'Medication records'],
    },
    {
      id: '2',
      title: 'Vitals Export - January 2026',
      type: 'csv',
      date: '2026-01-30',
      size: '156 KB',
      fileSize: 156,
      lastGenerated: '1 day ago',
      description: 'Raw vital signs data in CSV format for use in clinical evaluations or external analysis.',
      dataIncluded: ['Heart rate readings', 'Blood pressure', 'Oxygen levels', 'Temperature', 'Timestamps'],
    },
    {
      id: '3',
      title: 'Quarterly Comprehensive Report - Q4 2025',
      type: 'pdf',
      date: '2026-01-15',
      size: '5.8 MB',
      fileSize: 5800,
      lastGenerated: '15 days ago',
      description: 'Detailed quarterly analysis of health trends, medical events, and long-term patterns.',
      dataIncluded: [
        'Quarterly trends',
        'Medical records summary',
        'All vital statistics',
        'Health milestones',
        'Risk assessment',
      ],
    },
    {
      id: '4',
      title: 'Clinical Evaluation Data',
      type: 'json',
      date: '2026-01-25',
      size: '892 KB',
      fileSize: 892,
      lastGenerated: '5 days ago',
      description: 'Structured clinical data in JSON format for healthcare provider systems.',
      dataIncluded: ['Vital readings', 'Medical history', 'Test results', 'Timestamps', 'Metadata'],
    },
    {
      id: '5',
      title: 'Annual Health Report - 2025',
      type: 'pdf',
      date: '2026-01-01',
      size: '8.2 MB',
      fileSize: 8200,
      lastGenerated: '29 days ago',
      description: 'Complete annual health summary with year-over-year comparisons and insights.',
      dataIncluded: [
        'Annual statistics',
        'Year-on-year comparison',
        'Health achievements',
        'Medical events',
        'Recommendations',
      ],
    },
    {
      id: '6',
      title: 'Vitals Export - Clinic Evaluation',
      type: 'csv',
      date: '2026-01-20',
      size: '234 KB',
      fileSize: 234,
      lastGenerated: '10 days ago',
      description: 'Curated vital signs data extracted for clinic evaluation purposes.',
      dataIncluded: ['Heart rate', 'Blood pressure', 'O2 saturation', 'Temperature', 'Patient ID'],
    },
  ]

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileText className="h-5 w-5 text-red-500" />
      case 'csv':
        return <File className="h-5 w-5 text-green-500" />
      case 'json':
        return <File className="h-5 w-5 text-blue-500" />
      default:
        return <File className="h-5 w-5" />
    }
  }

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'pdf':
        return 'bg-red-100 text-red-800'
      case 'csv':
        return 'bg-green-100 text-green-800'
      case 'json':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <DashboardLayout>
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Reports & Downloads</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Download and export your health data in various formats for clinical use or personal records
        </p>
      </header>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{reports.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Available for download</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {(reports.reduce((sum, r) => sum + r.fileSize, 0) / 1024).toFixed(1)} MB
            </div>
            <p className="text-xs text-muted-foreground mt-1">All files combined</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Latest Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">January 2026</div>
            <p className="text-xs text-muted-foreground mt-1">Monthly summary</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Sort */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          All Types
        </Button>
        <Button variant="outline" size="sm">
          PDF
        </Button>
        <Button variant="outline" size="sm">
          CSV
        </Button>
        <Button variant="outline" size="sm">
          JSON
        </Button>
      </div>

      {/* Reports Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1">
          <TabsTrigger value="all" className="rounded-md">All Reports</TabsTrigger>
          <TabsTrigger value="summaries" className="rounded-md">Summaries</TabsTrigger>
          <TabsTrigger value="clinical" className="rounded-md">Clinical Data</TabsTrigger>
          <TabsTrigger value="raw" className="rounded-md">Raw Data</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4 mt-4">
          {reports.map((report) => (
            <ReportCard key={report.id} report={report} getTypeIcon={getTypeIcon} getTypeBadgeColor={getTypeBadgeColor} />
          ))}
        </TabsContent>

        <TabsContent value="summaries" className="space-y-4 mt-4">
          {reports
            .filter((r) => r.type === 'pdf' && r.title.includes('Summary'))
            .map((report) => (
              <ReportCard key={report.id} report={report} getTypeIcon={getTypeIcon} getTypeBadgeColor={getTypeBadgeColor} />
            ))}
        </TabsContent>

        <TabsContent value="clinical" className="space-y-4 mt-4">
          {reports
            .filter((r) => r.title.includes('Clinical') || r.title.includes('Evaluation'))
            .map((report) => (
              <ReportCard key={report.id} report={report} getTypeIcon={getTypeIcon} getTypeBadgeColor={getTypeBadgeColor} />
            ))}
        </TabsContent>

        <TabsContent value="raw" className="space-y-4 mt-4">
          {reports
            .filter((r) => r.type === 'csv' || r.type === 'json')
            .map((report) => (
              <ReportCard key={report.id} report={report} getTypeIcon={getTypeIcon} getTypeBadgeColor={getTypeBadgeColor} />
            ))}
        </TabsContent>
      </Tabs>

      {/* Generate New Report */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle>Generate new report</CardTitle>
          <CardDescription>Create a custom report with selected data and date range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Report type</label>
                <select className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm">
                  <option>Health Summary</option>
                  <option>Clinical Data</option>
                  <option>Raw Vitals</option>
                  <option>Comprehensive Report</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Format</label>
                <select className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm">
                  <option>PDF</option>
                  <option>CSV</option>
                  <option>JSON</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Date range</label>
                <select className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm">
                  <option>Last 30 Days</option>
                  <option>Last 90 Days</option>
                  <option>Last Year</option>
                  <option>Custom Range</option>
                </select>
              </div>
            </div>
            <Button className="w-full gap-2">
              <Download className="h-4 w-4" />
              Generate report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Export to Third-Party */}
      <Card>
        <CardHeader>
          <CardTitle>Export to healthcare providers</CardTitle>
          <CardDescription>Share your health data with medical professionals or clinics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="outline" className="gap-2 w-full sm:w-auto">
              <Share2 className="h-4 w-4" />
              Generate share link
            </Button>
            <Button variant="outline" className="gap-2 w-full sm:w-auto">
              <Download className="h-4 w-4" />
              Export complete history
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            You can share reports with your healthcare provider for clinical evaluation. Share links expire after 30 days for
            security.
          </p>
        </CardContent>
      </Card>
    </div>
    </DashboardLayout>
  )
}

interface ReportCardProps {
  report: Report
  getTypeIcon: (type: string) => React.ReactNode
  getTypeBadgeColor: (type: string) => string
}

function ReportCard({ report, getTypeIcon, getTypeBadgeColor }: ReportCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow overflow-hidden">
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="mt-1 flex-shrink-0">{getTypeIcon(report.type)}</div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg">{report.title}</h3>
              <p className="text-sm text-muted-foreground mt-1 break-words">{report.description}</p>

              {/* Data Included */}
              <div className="mt-3 flex flex-wrap gap-2">
                {report.dataIncluded.map((item) => (
                  <Badge key={item} variant="secondary" className="text-xs">
                    {item}
                  </Badge>
                ))}
              </div>

              {/* Details */}
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {report.date}
                </span>
                <span>{report.size}</span>
                <span>Updated {report.lastGenerated}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-row sm:flex-col gap-2 flex-shrink-0">
            <Badge className={getTypeBadgeColor(report.type) + ' w-fit'}>
              {report.type.toUpperCase()}
            </Badge>
            <Button size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button size="sm" variant="outline" className="gap-2">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
