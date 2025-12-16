"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useProjectDetail, ProjectStatus } from "@/hooks/use-project-detail";
import { useUpdateProject } from "@/hooks/use-update-project";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type FieldErrors = {
  title?: string;
  description?: string;
  techStack?: string;
};

export default function EditProjectForm() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;
  const router = useRouter();

  const { data, loading, error, notFound } = useProjectDetail(projectId);
  const { update, isLoading, error: updateError, clearError } = useUpdateProject(projectId);

  const project = data.project;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [techStack, setTechStack] = useState("");
  const [status, setStatus] = useState<ProjectStatus>(ProjectStatus.ACTIVE);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [dirty, setDirty] = useState(false);

  const titleRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    if (project) {
      setTitle(project.title || "");
      setDescription(project.description || "");
      setTechStack(project.techStack || "");
      setStatus((project.status as ProjectStatus) || ProjectStatus.ACTIVE);
      setDirty(false);
    }
  }, [project]);

  useEffect(() => {
    if (updateError) {
      toast.error(updateError);
      clearError();
    }
  }, [updateError, clearError]);

  const initialSnapshot = useMemo(
    () => ({
      title: (project?.title || "").trim(),
      description: (project?.description || "").trim(),
      techStack: (project?.techStack || "").trim(),
      status: (project?.status as ProjectStatus) || ProjectStatus.ACTIVE,
    }),
    [project?.title, project?.description, project?.techStack, project?.status]
  );

  useEffect(() => {
    const current = {
      title: title.trim(),
      description: description.trim(),
      techStack: techStack.trim(),
      status,
    };
    const changed =
      current.title !== initialSnapshot.title ||
      current.description !== initialSnapshot.description ||
      current.techStack !== initialSnapshot.techStack ||
      current.status !== initialSnapshot.status;
    setDirty(changed);
  }, [title, description, techStack, status, initialSnapshot]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const canSubmit = useMemo(() => {
    const t = title.trim();
    return t.length >= 3 && t.length <= 150 && dirty && !isLoading;
  }, [title, dirty, isLoading]);

  const validate = useCallback((): boolean => {
    const errs: FieldErrors = {};
    const t = title.trim();
    if (t.length < 3) errs.title = "Minimal 3 karakter.";
    else if (t.length > 150) errs.title = "Maksimal 150 karakter.";

    if (description && description.length > 2000) {
      errs.description = "Maksimal 2000 karakter.";
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }, [title, description]);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;
      const res = await update({
        title: title.trim(),
        description: description.trim() || undefined,
        techStack: techStack.trim() || undefined,
        status,
      });
      if (res.ok) {
        toast.success(res.data.message || "Berhasil memperbarui project");
        router.push(`/projects/${projectId}`);
      }
    },
    [description, projectId, router, status, techStack, title, update, validate]
  );

  if (loading) return <LoadingState />;
  if (notFound) {
    return (
      <Card>
        <CardContent className="py-10">
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm text-muted-foreground">Project tidak ditemukan.</p>
            <Button asChild>
              <Link href="/projects">Kembali</Link>
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

  return (
    <form onSubmit={onSubmit} className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Edit Project</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1">
            <label htmlFor="title" className="text-sm font-medium">
              Project Title
            </label>
            <Input
              id="title"
              ref={titleRef}
              placeholder="Devlog Backend"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-invalid={!!fieldErrors.title}
              aria-describedby={fieldErrors.title ? "title-err" : undefined}
            />
            {fieldErrors.title ? (
              <span id="title-err" className="text-xs text-destructive">
                {fieldErrors.title}
              </span>
            ) : null}
          </div>

          <div className="grid gap-1">
            <label htmlFor="description" className="text-sm font-medium">
              Description
            </label>
            <Textarea
              id="description"
              placeholder="Short description about the project"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              aria-invalid={!!fieldErrors.description}
              aria-describedby={fieldErrors.description ? "desc-err" : undefined}
            />
            {fieldErrors.description ? (
              <span id="desc-err" className="text-xs text-destructive">
                {fieldErrors.description}
              </span>
            ) : null}
          </div>

          <div className="grid gap-1">
            <label htmlFor="tech" className="text-sm font-medium">
              Tech Stack
            </label>
            <Input
              id="tech"
              placeholder="NestJS, PostgreSQL, Redis"
              value={techStack}
              onChange={(e) => setTechStack(e.target.value)}
            />
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium">Status</label>
            <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus)}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ProjectStatus.ACTIVE}>Active</SelectItem>
                <SelectItem value={ProjectStatus.ARCHIVED}>Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={!canSubmit}>
          {isLoading ? "Menyimpan..." : "Save"}
        </Button>
        <Button type="button" variant="secondary" asChild disabled={isLoading}>
          <Link href={`/projects/${projectId}`}>Cancel</Link>
        </Button>
        {dirty ? (
          <span className="text-xs text-muted-foreground">Perubahan belum disimpan</span>
        ) : null}
      </div>
    </form>
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
        <CardContent className="grid gap-3">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-9 w-40" />
        </CardContent>
      </Card>
    </div>
  );
}


