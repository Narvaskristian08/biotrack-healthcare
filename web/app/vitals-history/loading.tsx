import { PatientPageRouteSkeleton } from '@/components/patient-page-skeleton';

export default function Loading() {
  return <PatientPageRouteSkeleton stats={4} controls={3} chartCards={1} listCards={2} listRows={5} />;
}
