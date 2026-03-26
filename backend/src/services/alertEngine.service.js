import Alert from '../models/Alert.js';

export async function evaluateAlerts({
  userId,
  currentRisk,
  previousRisk,
  fallDetected,
  trend,
}) {
  const alerts = [];

  // 1. Risk escalation
  if (
    previousRisk &&
    ['LOW', 'MODERATE'].includes(previousRisk) &&
    ['HIGH', 'CRITICAL'].includes(currentRisk)
  ) {
    alerts.push({
      type: 'RISK_ESCALATION',
      severity: currentRisk,
      message: `Health risk escalated from ${previousRisk} to ${currentRisk}.`,
    });
  }

  // 2. Critical risk
  if (currentRisk === 'CRITICAL') {
    alerts.push({
      type: 'CRITICAL_VITAL',
      severity: 'CRITICAL',
      message: 'Critical vital sign pattern detected.',
    });
  }

  // 3. Fall detection
  if (fallDetected) {
    alerts.push({
      type: 'FALL_DETECTED',
      severity: 'HIGH',
      message: 'Possible fall detected. Please check your condition.',
    });
  }

  // 4. Trend-based alert
  if (trend === 'INCREASING') {
    alerts.push({
      type: 'TREND_INCREASING',
      severity: 'MODERATE',
      message: 'Health risk trend is increasing over time.',
    });
  }

  // Save alerts
  for (const alert of alerts) {
    await Alert.create({
      userId,
      ...alert,
    });
  }

  return alerts;
}
