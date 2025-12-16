import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_HOST, COOKIE } from "./use-auth";
import type { WorklogsResponse } from "./use-dashboard";

export interface CreateWorklogPayload {
  logDate: string; // YYYY-MM-DD
  activityType: string;
  summary: string;
  timeSpent?: number;
  blockers?: string;
}

export interface CreateWorklogSuccess {
  success: true;
  message?: string;
  data: {
    id: string;
    logDate: string;
    activityType: string;
    summary: string;
    timeSpent?: number;
    blockers?: string;
    createdAt: string;
  };
}

export type CreateWorklogResult =
  | { ok: true; data: CreateWorklogSuccess }
  | { ok: false; error: string };

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const v = parts.pop();
    if (!v) return null;
    return decodeURIComponent(v.split(";").shift() || "");
  }
  return null;
}

export function useCreateWorklog(projectId: string | undefined) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const abortRef = useRef<AbortController | null>(null);

  const baseEndpoint = useMemo(() => {
    if (!projectId) return "";
    return `${API_HOST}/projects/${encodeURIComponent(projectId)}/worklogs`;
  }, [projectId]);

  const clearError = useCallback(() => setError(""), []);

  const checkConflict = useCallback(
    async (dateYmd: string): Promise<boolean> => {
      if (!API_HOST || !projectId) return false;
      const token = getCookie(COOKIE.ACCESS_TOKEN);
      if (!token) return false;
      try {
        const url = `${baseEndpoint}?fromDate=${encodeURIComponent(
          dateYmd
        )}&toDate=${encodeURIComponent(dateYmd)}&limit=1`;
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const contentType = res.headers.get("content-type") || "";
        const isJson = contentType.includes("application/json");
        if (!isJson) return false;
        const body = (await res.json()) as WorklogsResponse;
        return (body?.data || []).length > 0;
      } catch {
        return false;
      }
    },
    [baseEndpoint, projectId]
  );

  const create = useCallback(
    async (payload: CreateWorklogPayload): Promise<CreateWorklogResult> => {
      if (!API_HOST || !projectId) {
        const msg = "Konfigurasi atau parameter tidak valid.";
        setError(msg);
        return { ok: false, error: msg };
      }
      const token = getCookie(COOKIE.ACCESS_TOKEN);
      if (!token) {
        const msg = "Sesi tidak valid. Silakan login kembali.";
        setError(msg);
        return { ok: false, error: msg };
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError("");
      try {
        const res = await fetch(baseEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            logDate: payload.logDate,
            activityType: payload.activityType,
            summary: payload.summary,
            timeSpent:
              typeof payload.timeSpent === "number" ? payload.timeSpent : undefined,
            blockers:
              payload.blockers && payload.blockers.trim().length > 0
                ? payload.blockers.trim()
                : undefined,
          }),
          signal: controller.signal,
        });

        const contentType = res.headers.get("content-type") || "";
        const isJson = contentType.includes("application/json");
        const body = (isJson ? await res.json() : null) as
          | CreateWorklogSuccess
          | { success?: boolean; message?: string }
          | null;

        if (!res.ok) {
          const msg =
            (body as { message?: string } | null)?.message ||
            `Gagal membuat worklog (${res.status}).`;
          setError(msg);
          return { ok: false, error: msg };
        }
        return { ok: true, data: body as CreateWorklogSuccess };
      } catch {
        if (controller.signal.aborted) {
          return { ok: false, error: "Dibatalkan." };
        }
        const msg = "Gagal membuat worklog. Coba lagi.";
        setError(msg);
        return { ok: false, error: msg };
      } finally {
        setIsLoading(false);
      }
    },
    [baseEndpoint, projectId]
  );

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  return { create, checkConflict, isLoading, error, clearError };
}


