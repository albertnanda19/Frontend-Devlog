"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProjectDetail, ProjectStatus } from "@/hooks/use-project-detail";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import Link from "next/link";

function StatusBadge({ status }: { status?: string }) {
  const s = status?.toUpperCase();
  if (s === ProjectStatus.ACTIVE) return <Badge>Active</Badge>;
  if (s === ProjectStatus.ARCHIVED) return <Badge variant="secondary">Archived</Badge>;
  return <Badge variant="outline">Unknown</Badge>;
}

export default function ProjectDetail() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;
  const router = useRouter();
  const { data, loading, error, notFound, remove, canManage } = useProjectDetail(projectId);
  const project = data.project;

  const lastWorklogDate = useMemo(() => {
    if (!data.worklogs?.length) return null;
    const latest = [...data.worklogs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
    return new Date(latest.createdAt).toLocaleString();
  }, [data.worklogs]);

  const [deleting, setDeleting] = useState(false);
  const onArchive = useCallback(async () => {
    if (!projectId) return;
    try {
      setDeleting(true);
      const res = await remove();
      if (res.ok) {
        router.push("/projects");
        return;
      }
      // fallback: stay and do nothing on failure to avoid jarring UX
    } finally {
      setDeleting(false);
    }
  }, [remove, projectId, router]);

  if (loading) {
    return <LoadingState />;
  }

  if (notFound) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-muted-foreground">Project tidak ditemukan.</p>
            <Button asChild>
              <Link href="/projects">Kembali ke Projects</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!project) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-muted-foreground">{error || "Gagal memuat project. Coba lagi."}</p>
            <Button onClick={() => router.refresh()}>Coba lagi</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isArchived = project.status === ProjectStatus.ARCHIVED;
  const totalWorklogs = data.worklogsMeta?.totalItems ?? data.worklogs.length;

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
            <BreadcrumbPage>{project.title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {isArchived && (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              Project ini telah diarsipkan. Aksi pengelolaan dinonaktifkan.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{project.title}</h1>
          <div className="mt-2">
            <StatusBadge status={project.status} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild disabled={isArchived}>
            <Link href={`/projects/${project.id}/worklogs/new`}>Add Worklog</Link>
          </Button>
          {!isArchived && canManage && (
            <>
              <Button asChild variant="secondary">
                <Link href={`/projects/${project.id}/edit`}>Edit</Link>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={deleting}>
                    {deleting ? "Mengarsipkan..." : "Archive"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Arsipkan project?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tindakan ini tidak dapat dibatalkan. Project akan diarsipkan.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={onArchive} disabled={deleting}>
                      {deleting ? "Mengarsipkan..." : "Lanjutkan"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Deskripsi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-sm text-muted-foreground whitespace-pre-wrap">
            {project.description || "-"}
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Tech Stack:</span>{" "}
            <span>{project.techStack || "-"}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            Dibuat: {new Date(project.createdAt).toLocaleString()}
            {project.updatedAt ? ` · Diperbarui: ${new Date(project.updatedAt).toLocaleString()}` : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ringkasan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total worklogs</span>
              <span className="text-sm font-medium">{totalWorklogs}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Worklog terakhir</span>
              <span className="text-sm font-medium">
                {lastWorklogDate || "-"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Worklogs terbaru</CardTitle>
            <Button asChild variant="secondary">
              <Link href={`/projects/${project.id}/worklogs`}>View all worklogs</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {data.worklogs.length === 0 ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Belum ada worklog.</p>
              <Button asChild>
                <Link href={`/projects/${project.id}/worklogs/new`}>Add worklog</Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead>Ringkasan</TableHead>
                  <TableHead className="text-right">Menit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.worklogs.map((w) => (
                  <TableRow
                    key={w.id}
                    className="cursor-pointer"
                    onClick={() =>
                      router.push(`/projects/${project.id}/worklogs/${w.id}`)
                    }
                  >
                    <TableCell className="text-sm">
                      {new Date(w.logDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm">{w.activityType}</TableCell>
                    <TableCell className="text-sm">
                      <div className="line-clamp-1">{w.summary}</div>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {w.timeSpent}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
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
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </CardContent>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-24" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-9 w-36" />
          </div>
        </CardHeader>
        <CardContent>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="grid grid-cols-12 gap-4 py-3">
              <div className="col-span-2">
                <Skeleton className="h-4 w-3/4" />
              </div>
              <div className="col-span-3">
                <Skeleton className="h-4 w-2/3" />
              </div>
              <div className="col-span-5">
                <Skeleton className="h-4 w-5/6" />
              </div>
              <div className="col-span-2 flex justify-end">
                <Skeleton className="h-4 w-10" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}


