"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCreateProject } from "@/hooks/use-create-project";
import { ProjectStatus } from "@/hooks/use-project-detail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type FieldErrors = {
  title?: string;
  description?: string;
  techStack?: string;
};

export default function CreateProjectForm() {
  const router = useRouter();
  const { create, isLoading, error, clearError } = useCreateProject();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [techStack, setTechStack] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const titleRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  const canSubmit = useMemo(() => {
    return title.trim().length >= 3 && title.trim().length <= 150 && !isLoading;
  }, [title, isLoading]);

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
      const res = await create({
        title: title.trim(),
        description: description.trim() || undefined,
        techStack: techStack.trim() || undefined,
        status: ProjectStatus.ACTIVE,
      });
      if (res.ok) {
        const id = res.data.data.id;
        toast.success(res.data.message || "Berhasil membuat project");
        router.push(`/projects/${id}`);
      }
    },
    [create, description, techStack, title, router, validate]
  );

  return (
    <form onSubmit={onSubmit} className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Project</CardTitle>
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
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={!canSubmit}>
          {isLoading ? "Menyimpan..." : "Create"}
        </Button>
        <Button type="button" variant="secondary" asChild disabled={isLoading}>
          <Link href="/projects">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}


