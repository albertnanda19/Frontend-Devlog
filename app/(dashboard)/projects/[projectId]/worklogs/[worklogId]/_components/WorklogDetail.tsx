"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useWorklogDetail } from "@/hooks/use-worklog-detail";
import { useProjectDetail, ProjectStatus } from "@/hooks/use-project-detail";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function WorklogDetail() {
  const params = useParams<{ projectId: string; worklogId: string }>();
  const projectId = params?.projectId;
  const worklogId = params?.worklogId;
  const router = useRouter();

  const { data: pd } = useProjectDetail(projectId);
  const archived = pd.project?.status === ProjectStatus.ARCHIVED;

  const { data, loading, error, notFound, remove } = useWorklogDetail(
    projectId,
    worklogId
  );

  const title = useMemo(() => {
    if (!data) return "Worklog";
    const d = new Date(data.logDate).toLocaleDateString();
    return `Worklog – ${d}`;
  }, [data]);

  const projectTitle = useMemo(() => {
    return data?.project?.title || pd.project?.title || "Project";
  }, [data?.project?.title, pd.project?.title]);

  const [deleting, setDeleting] = useState(false);
  const onDelete = useCallback(async () => {
    try {
      setDeleting(true);
      const res = await remove();
      if (res.ok) {
        router.push(`/projects/${projectId}/worklogs`);
        return;
      }
    } finally {
      setDeleting(false);
    }
  }, [remove, router, projectId]);

  if (loading) return <LoadingState />;

  if (notFound) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-muted-foreground">Worklog tidak ditemukan.</p>
            <Button asChild>
              <Link href={`/projects/${projectId}/worklogs`}>Kembali</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-muted-foreground">{error || "Gagal memuat worklog. Coba lagi."}</p>
            <Button onClick={() => router.refresh()}>Coba lagi</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/projects">Projects</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/projects/${projectId}`}>{projectTitle}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Worklog</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{projectTitle}</span>
            <Badge>{data.activityType}</Badge>
          </div>
        </div>
        {!archived && (
          <div className="flex items-center gap-2">
            <Button asChild variant="secondary">
              <Link href={`/projects/${projectId}/worklogs/${worklogId}/edit`}>
                Edit
              </Link>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={deleting}>
                  {deleting ? "Menghapus..." : "Delete"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus worklog?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tindakan ini tidak dapat dibatalkan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={onDelete} disabled={deleting}>
                    {deleting ? "Menghapus..." : "Lanjutkan"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detail</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <DetailRow label="Date" value={new Date(data.logDate).toLocaleDateString()} />
          <DetailRow label="Activity" value={data.activityType} />
          <DetailRow label="Time Spent (minutes)" value={String(data.timeSpent)} />
          <div className="sm:col-span-2">
            <DetailRow label="Summary" value={data.summary} multiline />
          </div>
          <div className="sm:col-span-2">
            <DetailRow label="Blockers" value={data.blockers || "-"} multiline />
          </div>
          <div className="sm:col-span-2 text-xs text-muted-foreground">
            Dibuat: {new Date(data.createdAt).toLocaleString()}
            {data.updatedAt ? ` · Diperbarui: ${new Date(data.updatedAt).toLocaleString()}` : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DetailRow({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={multiline ? "whitespace-pre-wrap text-sm" : "text-sm"}>{value}</div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-1/2" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-4 w-1/3" />
        </CardContent>
      </Card>
    </div>
  );
}


