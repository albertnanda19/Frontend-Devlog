"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { useDashboardData } from "@/hooks/use-dashboard";

const ROUTES = {
  DASHBOARD: "/dashboard",
} as const;

function SummaryCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link href={href} className="block">
      <Card className="transition-colors hover:border-primary">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">
            {label}
          </CardTitle>
          <CardDescription className="text-3xl font-semibold text-foreground">
            {value}
          </CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}

function SummaryCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-16 mt-2" />
      </CardHeader>
    </Card>
  );
}

export default function UserDashboard() {
  const { loading, error, data, reload } = useDashboardData();

  const projectsRaw = data?.projects?.data;
  const projects = useMemo(() => projectsRaw ?? [], [projectsRaw]);
  const recentWorklogsRaw = data?.recentWorklogs;
  const recentWorklogs = useMemo(
    () => recentWorklogsRaw ?? [],
    [recentWorklogsRaw]
  );

  const userName = data?.me?.fullName ?? "User";

  const hasProjects = projects.length > 0;
  const hasWorklogs = recentWorklogs.length > 0;

  const projectItems = useMemo(() => projects.slice(0, 5), [projects]);
  const worklogItems = useMemo(
    () => recentWorklogs.slice(0, 5),
    [recentWorklogs]
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 py-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back, {userName}
          </h1>
          <p className="text-muted-foreground text-sm">
            Ringkasan aktivitas developer Anda
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={reload} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <>
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
          </>
        ) : (
          <>
            <SummaryCard
              label="Total Projects"
              value={data?.totals.totalProjects ?? 0}
              href={ROUTES.DASHBOARD}
            />
            <SummaryCard
              label="Worklogs This Week"
              value={data?.totals.worklogsThisWeek ?? 0}
              href={ROUTES.DASHBOARD}
            />
          </>
        )}
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Projects</CardTitle>
              <CardDescription>Project terbaru Anda</CardDescription>
            </div>
            <Button asChild>
              <Link href={ROUTES.DASHBOARD}>New Project</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ))}
              </div>
            ) : hasProjects ? (
              <ul className="space-y-4">
                {projectItems.map((p) => (
                  <li key={p.id} className="min-w-0">
                    <div className="font-medium truncate">{p.title}</div>
                    <div className="text-muted-foreground text-sm line-clamp-2">
                      {p.description}
                    </div>
                    <div className="text-muted-foreground text-xs mt-1">
                      {p.techStack}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty className="border py-8">
                <EmptyHeader>
                  <EmptyTitle>Belum ada project</EmptyTitle>
                  <EmptyDescription>
                    Mulai dengan membuat project baru.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button asChild>
                    <Link href={ROUTES.DASHBOARD}>New Project</Link>
                  </Button>
                </EmptyContent>
              </Empty>
            )}
          </CardContent>
        </Card>

        {/* Worklogs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Worklogs</CardTitle>
              <CardDescription>
                5 worklog terbaru dari project Anda
              </CardDescription>
            </div>
            <Button variant="outline" asChild>
              <Link href={ROUTES.DASHBOARD}>Add Worklog</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ))}
              </div>
            ) : hasWorklogs ? (
              <ul className="space-y-4">
                {worklogItems.map((w) => (
                  <li key={w.id} className="min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium truncate">
                        {w.activityType}
                      </div>
                      <div className="text-muted-foreground text-xs shrink-0">
                        {new Date(w.logDate).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="text-muted-foreground text-sm line-clamp-2">
                      {w.summary}
                    </div>
                    <div className="text-muted-foreground text-xs mt-1">
                      {Math.round(w.timeSpent)} min
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty className="border py-8">
                <EmptyHeader>
                  <EmptyTitle>Belum ada worklog</EmptyTitle>
                  <EmptyDescription>
                    Tambahkan worklog untuk melacak progress harian Anda.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button variant="outline" asChild>
                    <Link href={ROUTES.DASHBOARD}>Add Worklog</Link>
                  </Button>
                </EmptyContent>
              </Empty>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Error Fallback */}
      {error && !loading && (
        <div className="text-destructive text-sm">{error}</div>
      )}
    </div>
  );
}
