"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useWorklogDetail } from "@/hooks/use-worklog-detail";
import { useUpdateWorklog } from "@/hooks/use-update-worklog";
import { ACTIVITY_OPTIONS } from "@/lib/activity";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

type FieldErrors = {
  activityType?: string;
  summary?: string;
  timeSpent?: string;
  blockers?: string;
};

export default function EditWorklogForm() {
  const params = useParams<{ projectId: string; worklogId: string }>();
  const projectId = params?.projectId;
  const worklogId = params?.worklogId;
  const router = useRouter();
  const { data, loading, error, notFound } = useWorklogDetail(projectId, worklogId);
  const { update, isLoading, error: updateError, clearError } = useUpdateWorklog(projectId, worklogId);

  const [activityType, setActivityType] = useState<string>(ACTIVITY_OPTIONS[0]);
  const [summary, setSummary] = useState<string>("");
  const [timeSpent, setTimeSpent] = useState<string>("");
  const [blockers, setBlockers] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [dirty, setDirty] = useState(false);

  const summaryRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    summaryRef.current?.focus();
  }, []);

  useEffect(() => {
    if (data) {
      setActivityType(data.activityType || ACTIVITY_OPTIONS[0]);
      setSummary(data.summary || "");
      setTimeSpent(typeof data.timeSpent === "number" ? String(data.timeSpent) : "");
      setBlockers(data.blockers || "");
      setDirty(false);
    }
  }, [data]);

  useEffect(() => {
    if (updateError) {
      toast.error(updateError);
      clearError();
    }
  }, [updateError, clearError]);

  const initialSnapshot = useMemo(
    () => ({
      activityType: data?.activityType || ACTIVITY_OPTIONS[0],
      summary: (data?.summary || "").trim(),
      timeSpent: typeof data?.timeSpent === "number" ? String(data?.timeSpent) : "",
      blockers: (data?.blockers || "").trim(),
    }),
    [data?.activityType, data?.summary, data?.timeSpent, data?.blockers]
  );

  useEffect(() => {
    const current = {
      activityType,
      summary: summary.trim(),
      timeSpent,
      blockers: blockers.trim(),
    };
    const changed =
      current.activityType !== initialSnapshot.activityType ||
      current.summary !== initialSnapshot.summary ||
      current.timeSpent !== initialSnapshot.timeSpent ||
      current.blockers !== initialSnapshot.blockers;
    setDirty(changed);
  }, [activityType, blockers, summary, timeSpent, initialSnapshot]);

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
    const s = summary.trim();
    const summaryOk = s.length >= 10 && s.length <= 2000;
    const timeOk = timeSpent === "" || (Number(timeSpent) >= 1 && Number(timeSpent) <= 1440);
    return dirty && summaryOk && timeOk && !isLoading;
  }, [dirty, isLoading, summary, timeSpent]);

  const validate = useCallback((): boolean => {
    const errs: FieldErrors = {};
    if (!activityType || !ACTIVITY_OPTIONS.includes(activityType)) {
      errs.activityType = "Pilih aktivitas.";
    }
    const s = summary.trim();
    if (s.length < 10) errs.summary = "Minimal 10 karakter.";
    else if (s.length > 2000) errs.summary = "Maksimal 2000 karakter.";
    if (timeSpent) {
      const n = Number(timeSpent);
      if (!Number.isFinite(n) || n < 1 || n > 1440) {
        errs.timeSpent = "Min 1, max 1440 menit.";
      }
    }
    if (blockers && blockers.length > 1000) {
      errs.blockers = "Maksimal 1000 karakter.";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }, [activityType, blockers, summary, timeSpent]);

  const onSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    if (!validate()) return;
    const res = await update({
      logDate: data.logDate,
      activityType,
      summary: summary.trim(),
      timeSpent: timeSpent ? Number(timeSpent) : undefined,
      blockers: blockers.trim() || undefined,
    });
    if (res.ok) {
      toast.success(res.data.message || "Berhasil mengupdate worklog");
      router.push(`/projects/${projectId}/worklogs/${worklogId}`);
    }
  }, [activityType, blockers, data, projectId, router, summary, timeSpent, update, worklogId, validate]);

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
    <form onSubmit={onSubmit} className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Edit Worklog</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1">
            <label htmlFor="logDate" className="text-sm font-medium">Log Date</label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Input id="logDate" type="date" value={data.logDate} readOnly />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-[240px]">Log date cannot be changed to preserve daily history</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="grid gap-1">
            <label className="text-sm font-medium">Activity Type</label>
            <Select value={activityType} onValueChange={(v) => setActivityType(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select activity" />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.activityType ? (
              <span className="text-xs text-destructive">{fieldErrors.activityType}</span>
            ) : null}
          </div>

          <div className="grid gap-1">
            <label htmlFor="timeSpent" className="text-sm font-medium">Time Spent (minutes)</label>
            <Input
              id="timeSpent"
              type="number"
              inputMode="numeric"
              min={1}
              max={1440}
              placeholder="e.g. 90"
              value={timeSpent}
              onChange={(e) => setTimeSpent(e.target.value)}
              aria-invalid={!!fieldErrors.timeSpent}
              aria-describedby={fieldErrors.timeSpent ? "time-err" : undefined}
            />
            {fieldErrors.timeSpent ? (
              <span id="time-err" className="text-xs text-destructive">{fieldErrors.timeSpent}</span>
            ) : null}
          </div>

          <div className="grid gap-1">
            <label htmlFor="summary" className="text-sm font-medium">Summary</label>
            <Textarea
              id="summary"
              placeholder="What changed?"
              ref={summaryRef}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              aria-invalid={!!fieldErrors.summary}
              aria-describedby={fieldErrors.summary ? "summary-err" : undefined}
            />
            {fieldErrors.summary ? (
              <span id="summary-err" className="text-xs text-destructive">{fieldErrors.summary}</span>
            ) : null}
          </div>

          <div className="grid gap-1">
            <label htmlFor="blockers" className="text-sm font-medium">Blockers</label>
            <Textarea
              id="blockers"
              placeholder="Optional"
              value={blockers}
              onChange={(e) => setBlockers(e.target.value)}
              aria-invalid={!!fieldErrors.blockers}
              aria-describedby={fieldErrors.blockers ? "blockers-err" : undefined}
            />
            {fieldErrors.blockers ? (
              <span id="blockers-err" className="text-xs text-destructive">{fieldErrors.blockers}</span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={!canSubmit}>
          {isLoading ? "Menyimpan..." : "Save"}
        </Button>
        <Button type="button" variant="secondary" asChild disabled={isLoading}>
          <Link href={`/projects/${projectId}/worklogs/${worklogId}`}>Cancel</Link>
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
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}


