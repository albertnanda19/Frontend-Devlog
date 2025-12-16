"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProjects, type ProjectStatusFilter } from "@/hooks/use-projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import { Plus, Eye, Pencil, Trash2 } from "lucide-react";

function useDebouncedValue<T>(value: T, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function statusBadge(status: string) {
  const s = status?.toUpperCase();
  if (s === "ACTIVE") return <Badge>Active</Badge>;
  if (s === "ARCHIVED") return <Badge variant="secondary">Archived</Badge>;
  return <Badge variant="outline">Unknown</Badge>;
}

export default function ProjectsList() {
  const router = useRouter();
  const { data, loading, error, query, setParams, reload, remove } =
    useProjects({
      page: 1,
      limit: 10,
      status: "ALL",
    });

  const [search, setSearch] = useState(query.search || "");
  const debouncedSearch = useDebouncedValue(search, 400);

  useEffect(() => {
    setParams({ search: debouncedSearch, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const onStatusChange = useCallback(
    (v: string) => {
      setParams({ status: v as ProjectStatusFilter, page: 1 });
    },
    [setParams]
  );

  const totalPages = useMemo(
    () => data?.meta?.totalPages ?? 1,
    [data?.meta?.totalPages]
  );
  const currentPage = useMemo(
    () => data?.meta?.page ?? query.page ?? 1,
    [data?.meta?.page, query.page]
  );

  const projects = data?.data ?? [];

  const handleDelete = useCallback(
    async (id: string) => {
      await remove(id);
    },
    [remove]
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
        </div>
        <Button asChild>
          <Link href="/projects/add">
            <Plus className="mr-2 size-4" /> New Project
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 w-full sm:max-w-md">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects..."
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={query.status || "ALL"} onValueChange={onStatusChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState onRetry={reload} />
      ) : projects.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="hidden md:block">
            <ProjectsTable
              items={projects}
              onRowClick={(id) => router.push(`/projects/${id}`)}
              onDelete={handleDelete}
            />
          </div>
          <div className="grid gap-3 md:hidden">
            {projects.map((p) => (
              <ProjectCard key={p.id} {...p} onDelete={handleDelete} />
            ))}
          </div>

          {totalPages > 1 && (
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
      <div className="hidden md:block">
        <div className="grid grid-cols-12 gap-4 rounded-md border p-4">
          <div className="col-span-4">
            <Skeleton className="h-4 w-3/5" />
          </div>
          <div className="col-span-3">
            <Skeleton className="h-4 w-2/5" />
          </div>
          <div className="col-span-3">
            <Skeleton className="h-4 w-2/5" />
          </div>
          <div className="col-span-2">
            <Skeleton className="h-4 w-2/5" />
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-12 gap-4 rounded-md border p-4"
          >
            <div className="col-span-4">
              <Skeleton className="h-4 w-4/5" />
            </div>
            <div className="col-span-3">
              <Skeleton className="h-4 w-3/5" />
            </div>
            <div className="col-span-3">
              <Skeleton className="h-4 w-3/5" />
            </div>
            <div className="col-span-2 flex items-center justify-end gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-3 md:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-1/4" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-2 py-8">
        <p className="text-sm text-muted-foreground">Gagal memuat projects.</p>
        <Button onClick={onRetry}>Coba lagi</Button>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>Tidak ada project</EmptyTitle>
        <EmptyDescription>Buat project baru untuk memulai.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild>
          <Link href="/projects/add">
            <Plus className="mr-2 size-4" /> New Project
          </Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}

type Item = NonNullable<ReturnType<typeof useProjects>["data"]>["data"][number];

function ProjectsTable({
  items,
  onRowClick,
  onDelete,
}: {
  items: Item[];
  onRowClick: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Title</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((p) => (
          <TableRow
            key={p.id}
            className="cursor-pointer"
            onClick={() => onRowClick(p.id)}
          >
            <TableCell className="font-medium">
              <div className="line-clamp-1">{p.title}</div>
              <div className="text-xs text-muted-foreground line-clamp-1">
                {p.description}
              </div>
            </TableCell>
            <TableCell>{statusBadge(p.status)}</TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {new Date(p.createdAt).toLocaleDateString()}
            </TableCell>
            <TableCell
              className="text-right"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-end gap-2">
                <Button asChild variant="ghost" size="icon" aria-label="View">
                  <Link href={`/projects/${p.id}`}>
                    <Eye className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="icon" aria-label="Edit">
                  <Link href={`/projects/${p.id}/edit`}>
                    <Pencil className="size-4" />
                  </Link>
                </Button>
                <DeleteConfirm onConfirm={async () => onDelete(p.id)}>
                  <Button variant="ghost" size="icon" aria-label="Delete">
                    <Trash2 className="size-4" />
                  </Button>
                </DeleteConfirm>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ProjectCard(p: Item & { onDelete: (id: string) => void }) {
  const router = useRouter();
  return (
    <Card
      className="cursor-pointer"
      onClick={() => router.push(`/projects/${p.id}`)}
    >
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="line-clamp-1">{p.title}</span>
          {statusBadge(p.status)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {p.description}
        </p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{new Date(p.createdAt).toLocaleDateString()}</span>
          <div
            className={cn("flex items-center gap-2")}
            onClick={(e) => e.stopPropagation()}
          >
            <Button asChild variant="ghost" size="sm">
              <Link href={`/projects/${p.id}`}>
                <Eye className="mr-1 size-4" /> View
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/projects/${p.id}/edit`}>
                <Pencil className="mr-1 size-4" /> Edit
              </Link>
            </Button>
            <DeleteConfirm onConfirm={async () => p.onDelete(p.id)}>
              <Button variant="ghost" size="sm">
                <Trash2 className="mr-1 size-4" /> Delete
              </Button>
            </DeleteConfirm>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DeleteConfirm({
  children,
  onConfirm,
}: {
  children: React.ReactNode;
  onConfirm: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);
  const handle = useCallback(async () => {
    try {
      setBusy(true);
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }, [onConfirm]);
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete project?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the
            project.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handle} disabled={busy}>
            {busy ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
