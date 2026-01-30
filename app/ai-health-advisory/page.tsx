'use client'

import { AlertCircle, TrendingDown, TrendingUp, Lightbulb, Heart, Zap, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface HealthAdvisory {
  id: string
  title: string
  description: string
  riskLevel: 'low' | 'moderate' | 'high'
  recommendation: string
  actionable: boolean
  icon: React.ReactNode
  timestamp: string
}

export default function AIHealthAdvisoryPage() {
  const healthAdvisories: HealthAdvisory[] = [
    {
      id: '1',
      title: 'Hydration Reminder',
      description:
        'Your oxygen levels have been stable, but maintaining proper hydration is essential for optimal cardiovascular health.',
      riskLevel: 'low',
      recommendation:
        'Increase water intake to 8-10 glasses per day. Consider hydration monitoring during exercise.',
      actionable: true,
      icon: <Droplet className="h-6 w-6 text-blue-500" />,
      timestamp: '2 hours ago',
    },
    {
      id: '2',
      title: 'Moderate Activity Level Detected',
      description:
        'Your recent activity levels have been below your weekly average. Light exercise may help improve cardiovascular fitness.',
      riskLevel: 'moderate',
      recommendation:
        'Aim for 30 minutes of moderate aerobic activity most days of the week. Start with brisk walking or swimming.',
      actionable: true,
      icon: <TrendingUp className="h-6 w-6 text-amber-500" />,
      timestamp: '1 day ago',
    },
    {
      id: '3',
      title: 'Sleep Pattern Analysis',
      description:
        'Your heart rate variability suggests inconsistent sleep patterns. Better sleep quality can significantly improve overall health.',
      riskLevel: 'moderate',
      recommendation:
        'Maintain a consistent sleep schedule. Aim for 7-9 hours of quality sleep. Avoid screens 1 hour before bedtime.',
      actionable: true,
      icon: <Zap className="h-6 w-6 text-purple-500" />,
      timestamp: '3 days ago',
    },
    {
      id: '4',
      title: 'Excellent Heart Health Metrics',
      description:
        'Your heart rate consistently remains within the healthy range. Keep maintaining your current lifestyle habits.',
      riskLevel: 'low',
      recommendation:
        'Continue regular exercise, maintain a balanced diet, and manage stress effectively. Your current routine is working well.',
      actionable: false,
      icon: <Heart className="h-6 w-6 text-red-500" />,
      timestamp: '1 week ago',
    },
  ]

  const riskIndicators = [
    {
      name: 'Cardiovascular Risk',
      level: 'low',
      score: 12,
      description: 'Heart health is in excellent condition',
      factors: ['Stable HR', 'Good BP', 'Normal O2'],
    },
    {
      name: 'Respiratory Risk',
      level: 'low',
      score: 8,
      description: 'Oxygen levels consistently healthy',
      factors: ['O2 98%+', 'Regular breathing', 'Active lifestyle'],
    },
    {
      name: 'Physical Activity Risk',
      level: 'moderate',
      score: 45,
      description: 'Activity below recommended levels',
      factors: ['Below daily average', 'Sedentary periods', 'Limited intensity'],
    },
    {
      name: 'Sleep Quality Risk',
      level: 'moderate',
      score: 38,
      description: 'Sleep patterns show variability',
      factors: ['Irregular schedule', 'Heart rate variance', 'Recovery time'],
    },
  ]

  const getRiskColor = (level: 'low' | 'moderate' | 'high') => {
    switch (level) {
      case 'low':
        return 'bg-green-500/10 text-green-700 border-green-200'
      case 'moderate':
        return 'bg-amber-500/10 text-amber-700 border-amber-200'
      case 'high':
        return 'bg-red-500/10 text-red-700 border-red-200'
    }
  }

  const getRiskBadgeColor = (level: 'low' | 'moderate' | 'high') => {
    switch (level) {
      case 'low':
        return 'bg-green-100 text-green-800'
      case 'moderate':
        return 'bg-amber-100 text-amber-800'
      case 'high':
        return 'bg-red-100 text-red-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">AI Health Advisory</h1>
        <p className="text-muted-foreground mt-1">
          Personalized health insights powered by AI analysis of your vital signs
        </p>
      </div>

      {/* Risk Indicators Overview */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Health Risk Assessment</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {riskIndicators.map((indicator) => (
            <Card key={indicator.name}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{indicator.name}</CardTitle>
                    <CardDescription>{indicator.description}</CardDescription>
                  </div>
                  <Badge className={getRiskBadgeColor(indicator.level as 'low' | 'moderate' | 'high')}>
                    {indicator.level.charAt(0).toUpperCase() + indicator.level.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Risk Score Bar */}
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Risk Score</span>
                    <span className="text-sm font-bold">{indicator.score}/100</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        indicator.score < 30
                          ? 'bg-green-500'
                          : indicator.score < 60
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                      }`}
                      style={{ width: `${indicator.score}%` }}
                    />
                  </div>
                </div>

                {/* Contributing Factors */}
                <div>
                  <p className="text-sm font-medium mb-2">Contributing Factors</p>
                  <div className="flex flex-wrap gap-2">
                    {indicator.factors.map((factor) => (
                      <Badge key={factor} variant="outline" className="text-xs">
                        {factor}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* AI-Generated Recommendations */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Personalized Recommendations & Insights</h2>
        <div className="space-y-4">
          {healthAdvisories.map((advisory) => (
            <Card key={advisory.id} className={`border-2 ${getRiskColor(advisory.riskLevel)}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {advisory.icon}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{advisory.title}</CardTitle>
                        <Badge className={getRiskBadgeColor(advisory.riskLevel)}>
                          {advisory.riskLevel.charAt(0).toUpperCase() + advisory.riskLevel.slice(1)} Risk
                        </Badge>
                      </div>
                      <CardDescription className="mt-2">{advisory.description}</CardDescription>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{advisory.timestamp}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Recommendation Box */}
                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Recommendation
                  </p>
                  <p className="text-sm text-foreground">{advisory.recommendation}</p>
                </div>

                {/* Action Button */}
                {advisory.actionable && (
                  <Button className="w-full gap-2" variant="outline">
                    <CheckCircle className="h-4 w-4" />
                    Start Action Plan
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Non-Diagnostic Note */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <CardTitle className="text-base text-blue-900">Important Medical Disclaimer</CardTitle>
              <CardDescription className="text-blue-800 mt-2">
                These insights are generated by AI analysis and are NOT a substitute for professional medical advice.
                Please consult with a healthcare provider for any health concerns or before making significant lifestyle
                changes.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  )
}

// Placeholder icon import
function Droplet({ className }: { className: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fillRule="evenodd"
        d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  )
}
