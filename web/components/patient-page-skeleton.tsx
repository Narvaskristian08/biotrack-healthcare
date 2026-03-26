'use client';

import DashboardLayout from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type PatientPageContentSkeletonProps = {
  stats?: number;
  controls?: number;
  chartCards?: number;
  listCards?: number;
  listRows?: number;
  actionButtons?: number;
  footerNotice?: boolean;
};

export function PatientPageContentSkeleton({
  stats = 3,
  controls = 0,
  chartCards = 1,
  listCards = 1,
  listRows = 3,
  actionButtons = 0,
  footerNotice = false,
}: PatientPageContentSkeletonProps) {
  return (
    <div className="space-y-8 max-w-5xl" aria-busy="true" aria-live="polite">
      <header className="space-y-2">
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </header>

      {controls > 0 ? (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: controls }).map((_, idx) => (
            <Skeleton key={`control-skeleton-${idx}`} className="h-9 w-20 rounded-md" />
          ))}
        </div>
      ) : null}

      {stats > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: stats }).map((_, idx) => (
            <Card key={`stat-skeleton-${idx}`}>
              <CardHeader className="pb-3 space-y-2">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {chartCards > 0
        ? Array.from({ length: chartCards }).map((_, idx) => (
          <Card key={`chart-card-skeleton-${idx}`}>
            <CardHeader className="space-y-2">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-72 w-full rounded-lg" />
            </CardContent>
          </Card>
        ))
        : null}

      {listCards > 0
        ? Array.from({ length: listCards }).map((_, cardIdx) => (
          <Card key={`list-card-skeleton-${cardIdx}`}>
            <CardHeader className="space-y-2">
              <Skeleton className="h-5 w-52" />
              <Skeleton className="h-4 w-60" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: listRows }).map((_, rowIdx) => (
                <Skeleton key={`list-row-skeleton-${cardIdx}-${rowIdx}`} className="h-14 w-full rounded-lg" />
              ))}
            </CardContent>
          </Card>
        ))
        : null}

      {actionButtons > 0 ? (
        <Card>
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: actionButtons }).map((_, idx) => (
              <Skeleton key={`action-button-skeleton-${idx}`} className="h-10 w-full rounded-md" />
            ))}
          </CardContent>
        </Card>
      ) : null}

      {footerNotice ? (
        <Card>
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
        </Card>
      ) : null}
    </div>
  );
}

export function PatientPageRouteSkeleton(props: PatientPageContentSkeletonProps) {
  return (
    <DashboardLayout>
      <PatientPageContentSkeleton {...props} />
    </DashboardLayout>
  );
}
