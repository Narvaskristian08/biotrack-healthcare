import { PatientPageRouteSkeleton } from '@/components/patient-page-skeleton';

export default function Loading() {
  return <PatientPageRouteSkeleton stats={0} chartCards={0} listCards={3} listRows={3} />;
}
