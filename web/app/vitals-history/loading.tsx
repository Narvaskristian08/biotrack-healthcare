import { PatientPageRouteSkeleton } from '@/components/patient-page-skeleton';

export default function Loading() {
  return <PatientPageRouteSkeleton stats={0} controls={3} chartCards={1} listCards={1} listRows={4} />;
}
