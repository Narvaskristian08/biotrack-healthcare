import { PatientPageRouteSkeleton } from '@/components/patient-page-skeleton';

export default function Loading() {
  return <PatientPageRouteSkeleton stats={3} chartCards={0} listCards={2} listRows={4} footerNotice />;
}
