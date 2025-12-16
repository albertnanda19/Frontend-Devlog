"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWorklogs } from "@/hooks/use-worklogs";
import { useProjectDetail, ProjectStatus } from "@/hooks/use-project-detail";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
import { Eye, Pencil, Trash2 } from "lucide-react";

function useDebouncedValue<T>(value: T, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function WorklogsList() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;
  const router = useRouter();

  const ALL_SENTINEL = "__ALL__";

  const { data: pd } = useProjectDetail(projectId);
  const archived = pd.project?.status === ProjectStatus.ARCHIVED;

  const { data, loading, error, query, setParams, reload, remove } =
    useWorklogs(projectId, {
      page: 1,
      limit: 10,
    });

  const [fromDate, setFromDate] = useState(query.fromDate || "");
  const [toDate, setToDate] = useState(query.toDate || "");
  const [activity, setActivity] = useState(query.activityType || "");

  const dFrom = useDebouncedValue(fromDate, 400);
  const dTo = useDebouncedValue(toDate, 400);
  const dAct = useDebouncedValue(activity, 400);

  useEffect(() => {
    setParams({
      fromDate: dFrom || undefined,
      toDate: dTo || undefined,
      activityType: dAct || undefined,
      page: 1,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dFrom, dTo, dAct]);

  const onResetFilters = useCallback(() => {
    setFromDate("");
    setToDate("");
    setActivity("");
    setParams({
      fromDate: undefined,
      toDate: undefined,
      activityType: undefined,
      page: 1,
    });
  }, [setParams]);

  const items = useMemo(() => {
    const list = data?.data ?? [];
    // Ensure sorted by date desc (logDate or createdAt fallback)
    return [...list].sort((a, b) => {
      const da = new Date(a.logDate || a.createdAt).getTime();
      const db = new Date(b.logDate || b.createdAt).getTime();
      return db - da;
    });
  }, [data?.data]);

  const totalPages = useMemo(
    () => data?.meta?.totalPages ?? 1,
    [data?.meta?.totalPages]
  );
  const currentPage = useMemo(
    () => data?.meta?.page ?? query.page ?? 1,
    [data?.meta?.page, query.page]
  );

  const uniqueActivities = useMemo(() => {
    const s = new Set<string>();
    (data?.data || []).forEach((w) => {
      if (w.activityType) s.add(w.activityType);
    });
    return Array.from(s).sort();
  }, [data?.data]);

  const [busyId, setBusyId] = useState<string>("");
  const onDelete = useCallback(
    async (id: string) => {
      try {
        setBusyId(id);
        await remove(id);
      } finally {
        setBusyId("");
      }
    },
    [remove]
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Worklogs</h1>
        <Button asChild disabled={archived}>
          <Link href={`/projects/${projectId}/worklogs/add`}>
            + Add Worklog
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-4 sm:gap-3 w-full">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">From</label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">To</label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Activity</label>
            <Select
              value={activity === "" ? ALL_SENTINEL : activity}
              onValueChange={(v) => setActivity(v === ALL_SENTINEL ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_SENTINEL}>All</SelectItem>
                {uniqueActivities.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              variant="secondary"
              onClick={onResetFilters}
              className="w-full"
            >
              Reset
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState projectId={projectId} archived={archived} />
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead>Blockers</TableHead>
                  <TableHead className="text-right">Minutes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((w) => (
                  <TableRow
                    key={w.id}
                    className="cursor-pointer"
                    onClick={() =>
                      router.push(`/projects/${projectId}/worklogs/${w.id}`)
                    }
                  >
                    <TableCell className="text-sm">
                      {new Date(w.logDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm">{w.activityType}</TableCell>
                    <TableCell className="text-sm">
                      <div className="line-clamp-1">{w.summary}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="line-clamp-1">{w.blockers || "-"}</div>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {w.timeSpent}
                    </TableCell>
                    <TableCell
                      className="text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-end gap-2">
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          aria-label="View"
                        >
                          <Link
                            href={`/projects/${projectId}/worklogs/${w.id}`}
                          >
                            <Eye className="size-4" />
                          </Link>
                        </Button>
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          aria-label="Edit"
                        >
                          <Link
                            href={`/projects/${projectId}/worklogs/${w.id}/edit`}
                          >
                            <Pencil className="size-4" />
                          </Link>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Delete"
                              disabled={busyId === w.id}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Hapus worklog?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Tindakan ini tidak dapat dibatalkan.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Batal</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => onDelete(w.id)}
                                disabled={busyId === w.id}
                              >
                                {busyId === w.id ? "Menghapus..." : "Hapus"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards could be added later if required; keep UI consistent and simple now */}

          {(data?.meta?.totalPages ?? 1) > 1 && (
            <div className="py-2">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1)
                          setParams({ page: (currentPage - 1) as number });
                      }}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }).map((_, i) => {
                    const page = i + 1;
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          href="#"
                          isActive={page === currentPage}
                          onClick={(e) => {
                            e.preventDefault();
                            setParams({ page });
                          }}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages)
                          setParams({ page: (currentPage + 1) as number });
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-12 gap-4 rounded-md border p-4">
        <div className="col-span-2">
          <Skeleton className="h-4 w-3/5" />
        </div>
        <div className="col-span-2">
          <Skeleton className="h-4 w-2/5" />
        </div>
        <div className="col-span-4">
          <Skeleton className="h-4 w-3/5" />
        </div>
        <div className="col-span-2">
          <Skeleton className="h-4 w-2/5" />
        </div>
        <div className="col-span-2">
          <Skeleton className="h-4 w-2/5" />
        </div>
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="grid grid-cols-12 gap-4 rounded-md border p-4">
          <div className="col-span-2">
            <Skeleton className="h-4 w-4/5" />
          </div>
          <div className="col-span-2">
            <Skeleton className="h-4 w-3/5" />
          </div>
          <div className="col-span-4">
            <Skeleton className="h-4 w-4/5" />
          </div>
          <div className="col-span-2">
            <Skeleton className="h-4 w-3/5" />
          </div>
          <div className="col-span-2 flex items-center justify-end gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-8">
        <p className="text-sm text-muted-foreground">Gagal memuat worklogs.</p>
        <Button onClick={onRetry}>Coba lagi</Button>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  projectId,
  archived,
}: {
  projectId?: string;
  archived?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between py-8">
        <p className="text-sm text-muted-foreground">Belum ada worklog.</p>
        <Button asChild disabled={archived}>
          <Link href={`/projects/${projectId}/worklogs/add`}>Add worklog</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
