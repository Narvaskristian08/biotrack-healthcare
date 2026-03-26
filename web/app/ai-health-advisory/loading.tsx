import { PatientPageRouteSkeleton } from '@/components/patient-page-skeleton';

export default function Loading() {
  return <PatientPageRouteSkeleton stats={3} chartCards={2} listCards={1} listRows={4} footerNotice />;
}
