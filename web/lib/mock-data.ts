export interface VitalReading {
  timestamp: string
  heartRate: number
  bloodPressure: string
  oxygenLevel: number
  temperature: number
  activityLevel: number
}

export interface PatientRecord {
  id: string
  name: string
  age: number
  gender: string
  condition: string
  lastVital: VitalReading
  alerts: string[]
  blockchainVerified: boolean
  recordDate: string
}

export interface HealthInsight {
  type: 'warning' | 'info' | 'success'
  title: string
  description: string
  timestamp: string
  actionable: boolean
}

// Mock Patient Data
export const mockPatientVitals: VitalReading[] = [
  { timestamp: '2026-01-30 09:00', heartRate: 72, bloodPressure: '120/80', oxygenLevel: 98, temperature: 37.1, activityLevel: 45 },
  { timestamp: '2026-01-30 12:00', heartRate: 75, bloodPressure: '118/78', oxygenLevel: 97, temperature: 37.0, activityLevel: 62 },
  { timestamp: '2026-01-30 15:00', heartRate: 68, bloodPressure: '119/79', oxygenLevel: 99, temperature: 36.9, activityLevel: 58 },
  { timestamp: '2026-01-30 18:00', heartRate: 70, bloodPressure: '121/81', oxygenLevel: 98, temperature: 37.2, activityLevel: 35 },
  { timestamp: '2026-01-29 09:00', heartRate: 74, bloodPressure: '122/82', oxygenLevel: 96, temperature: 37.0, activityLevel: 50 },
  { timestamp: '2026-01-29 12:00', heartRate: 76, bloodPressure: '120/80', oxygenLevel: 98, temperature: 37.1, activityLevel: 65 },
  { timestamp: '2026-01-29 15:00', heartRate: 71, bloodPressure: '119/79', oxygenLevel: 99, temperature: 37.0, activityLevel: 55 },
]

export const mockHealthInsights: HealthInsight[] = [
  {
    type: 'success',
    title: 'Heart Rate Stable',
    description: 'Your heart rate has been consistently within normal range for the past 7 days.',
    timestamp: '2026-01-30 08:00',
    actionable: false,
  },
  {
    type: 'info',
    title: 'Increased Activity Detected',
    description: 'You had 45% more movement today compared to your average. Great job staying active!',
    timestamp: '2026-01-30 18:00',
    actionable: false,
  },
  {
    type: 'warning',
    title: 'Low Activity Alert',
    description: 'Your activity level dropped below your weekly average. Consider taking a walk.',
    timestamp: '2026-01-28 19:00',
    actionable: true,
  },
]

export const mockMedicalRecords = [
  {
    id: '1',
    date: '2026-01-15',
    type: 'Routine Check-up',
    doctor: 'Dr. Sarah Johnson',
    notes: 'Patient is in good health. Continue current medication.',
    verified: true,
  },
  {
    id: '2',
    date: '2026-01-08',
    type: 'Lab Results',
    doctor: 'Lab Services',
    notes: 'Blood work normal. All values within expected ranges.',
    verified: true,
  },
  {
    id: '3',
    date: '2025-12-28',
    type: 'Prescription Refill',
    doctor: 'Dr. Michael Chen',
    notes: 'Refilled current medications. Schedule follow-up in 3 months.',
    verified: true,
  },
]

// Mock Provider Data
export const mockPatientsList: PatientRecord[] = [
  {
    id: 'P001',
    name: 'John Davis',
    age: 65,
    gender: 'Male',
    condition: 'Hypertension',
    lastVital: { timestamp: '2026-01-30 17:30', heartRate: 88, bloodPressure: '138/88', oxygenLevel: 96, temperature: 37.2, activityLevel: 42 },
    alerts: ['High Blood Pressure', 'Elevated Heart Rate'],
    blockchainVerified: true,
    recordDate: '2026-01-30',
  },
  {
    id: 'P002',
    name: 'Alice Miller',
    age: 42,
    gender: 'Female',
    condition: 'Diabetes Type 2',
    lastVital: { timestamp: '2026-01-30 16:45', heartRate: 72, bloodPressure: '120/75', oxygenLevel: 99, temperature: 36.8, activityLevel: 68 },
    alerts: [],
    blockchainVerified: true,
    recordDate: '2026-01-30',
  },
  {
    id: 'P003',
    name: 'Robert Wilson',
    age: 78,
    gender: 'Male',
    condition: 'Post-Fall Recovery',
    lastVital: { timestamp: '2026-01-30 14:20', heartRate: 82, bloodPressure: '125/80', oxygenLevel: 97, temperature: 37.1, activityLevel: 25 },
    alerts: ['Fall Risk Detected', 'Reduced Mobility'],
    blockchainVerified: true,
    recordDate: '2026-01-30',
  },
  {
    id: 'P004',
    name: 'Margaret Brown',
    age: 55,
    gender: 'Female',
    condition: 'Regular Check-up',
    lastVital: { timestamp: '2026-01-30 10:15', heartRate: 68, bloodPressure: '118/76', oxygenLevel: 99, temperature: 36.9, activityLevel: 75 },
    alerts: [],
    blockchainVerified: true,
    recordDate: '2026-01-30',
  },
]

// Chart data for trends
export const mockHeartRateTrend = [
  { day: 'Mon', average: 72, min: 60, max: 85 },
  { day: 'Tue', average: 74, min: 62, max: 88 },
  { day: 'Wed', average: 70, min: 58, max: 82 },
  { day: 'Thu', average: 73, min: 61, max: 86 },
  { day: 'Fri', average: 71, min: 59, max: 84 },
  { day: 'Sat', average: 75, min: 63, max: 87 },
  { day: 'Sun', average: 72, min: 60, max: 85 },
]

export const mockActivityTrend = [
  { day: 'Mon', steps: 8234, calories: 450 },
  { day: 'Tue', steps: 10234, calories: 580 },
  { day: 'Wed', steps: 7234, calories: 380 },
  { day: 'Thu', steps: 9234, calories: 520 },
  { day: 'Fri', steps: 6234, calories: 320 },
  { day: 'Sat', steps: 12234, calories: 750 },
  { day: 'Sun', steps: 11234, calories: 680 },
]

export const mockMovementTrend = [
  { date: 'Jan 24', walking: 2.5, running: 0.5, resting: 21 },
  { date: 'Jan 25', walking: 3.2, running: 1.2, resting: 19.6 },
  { date: 'Jan 26', walking: 1.8, running: 0, resting: 22.2 },
  { date: 'Jan 27', walking: 2.9, running: 0.8, resting: 20.3 },
  { date: 'Jan 28', walking: 3.5, running: 1.5, resting: 19 },
  { date: 'Jan 29', walking: 2.2, running: 0.3, resting: 21.5 },
  { date: 'Jan 30', walking: 3.1, running: 1.1, resting: 19.8 },
]
