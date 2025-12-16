"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useCreateWorklog } from "@/hooks/use-create-worklog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const ACTIVITY_OPTIONS: readonly string[] = [
  "Coding",
  "Code Review",
  "Debugging",
  "Research",
  "Meeting",
  "Documentation",
  "Other",
] as const;

type FieldErrors = {
  logDate?: string;
  activityType?: string;
  summary?: string;
  timeSpent?: string;
  blockers?: string;
};

function formatToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function AddWorklogForm() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;
  const router = useRouter();
  const { create, checkConflict, isLoading, error, clearError } = useCreateWorklog(projectId);

  const [logDate, setLogDate] = useState<string>(formatToday());
  const [activityType, setActivityType] = useState<string>(ACTIVITY_OPTIONS[0]);
  const [summary, setSummary] = useState<string>("");
  const [timeSpent, setTimeSpent] = useState<string>("");
  const [blockers, setBlockers] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [dateUsed, setDateUsed] = useState<boolean>(false);
  const [checkingDate, setCheckingDate] = useState<boolean>(false);

  const summaryRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    summaryRef.current?.focus();
  }, []);

  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  const canSubmit = useMemo(() => {
    return !isLoading && !dateUsed && summary.trim().length >= 10 && summary.trim().length <= 2000;
  }, [isLoading, dateUsed, summary]);

  const validate = useCallback((): boolean => {
    const errs: FieldErrors = {};
    if (!logDate) errs.logDate = "Tanggal wajib diisi.";
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
  }, [activityType, blockers, logDate, summary, timeSpent]);

  const runDateCheck = useCallback(async (dateStr: string) => {
    if (!projectId || !dateStr) return;
    setCheckingDate(true);
    const used = await checkConflict(dateStr);
    setDateUsed(used);
    setCheckingDate(false);
  }, [checkConflict, projectId]);

  useEffect(() => {
    void runDateCheck(logDate);
  }, [logDate, runDateCheck]);

  const onSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    if (dateUsed) {
      toast.error("Tanggal sudah memiliki worklog.");
      return;
    }
    const res = await create({
      logDate,
      activityType,
      summary: summary.trim(),
      timeSpent: timeSpent ? Number(timeSpent) : undefined,
      blockers: blockers.trim() || undefined,
    });
    if (res.ok) {
      toast.success(res.data.message || "Worklog created successfully");
      router.push(`/projects/${projectId}/worklogs`);
    }
  }, [activityType, blockers, create, dateUsed, logDate, projectId, summary, timeSpent, validate, router]);

  return (
    <form onSubmit={onSubmit} className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Worklog</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1">
            <label htmlFor="logDate" className="text-sm font-medium">Log Date</label>
            <Input
              id="logDate"
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              aria-invalid={!!(fieldErrors.logDate || dateUsed)}
              aria-describedby={(fieldErrors.logDate || dateUsed) ? "date-err" : undefined}
            />
            {fieldErrors.logDate ? (
              <span id="date-err" className="text-xs text-destructive">{fieldErrors.logDate}</span>
            ) : dateUsed ? (
              <span id="date-err" className="text-xs text-destructive">
                Tanggal sudah memiliki worklog.
              </span>
            ) : checkingDate ? (
              <span className="text-xs text-muted-foreground">Memeriksa tanggal...</span>
            ) : null}
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
              placeholder="e.g. 120"
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
              placeholder="What did you work on?"
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
          <Link href={`/projects/${projectId}/worklogs`}>Cancel</Link>
        </Button>
      </div>
    </form>
  );
}


