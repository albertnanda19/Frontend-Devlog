import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_HOST, COOKIE } from "./use-auth";

export interface UpdateWorklogPayload {
  logDate: string; // read-only in UI, but send as is
  activityType: string;
  summary: string;
  timeSpent?: number;
  blockers?: string;
}

export interface UpdateWorklogSuccess {
  success: true;
  message?: string;
  data: {
    id: string;
    logDate: string;
    activityType: string;
    summary: string;
    timeSpent?: number;
    blockers?: string;
    updatedAt?: string;
  };
}

export type UpdateWorklogResult =
  | { ok: true; data: UpdateWorklogSuccess }
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

export function useUpdateWorklog(
  projectId: string | undefined,
  worklogId: string | undefined
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const abortRef = useRef<AbortController | null>(null);

  const endpoint = useMemo(() => {
    if (!projectId || !worklogId) return "";
    return `${API_HOST}/projects/${encodeURIComponent(
      projectId
    )}/worklogs/${encodeURIComponent(worklogId)}`;
  }, [projectId, worklogId]);

  const clearError = useCallback(() => setError(""), []);

  const update = useCallback(
    async (payload: UpdateWorklogPayload): Promise<UpdateWorklogResult> => {
      if (!API_HOST || !projectId || !worklogId) {
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
        const res = await fetch(endpoint, {
          method: "PUT",
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
          | UpdateWorklogSuccess
          | { success?: boolean; message?: string }
          | null;

        if (!res.ok) {
          const msg =
            (body as { message?: string } | null)?.message ||
            `Gagal mengupdate worklog (${res.status}).`;
          setError(msg);
          return { ok: false, error: msg };
        }
        return { ok: true, data: body as UpdateWorklogSuccess };
      } catch {
        if (controller.signal.aborted) {
          return { ok: false, error: "Dibatalkan." };
        }
        const msg = "Gagal mengupdate worklog. Coba lagi.";
        setError(msg);
        return { ok: false, error: msg };
      } finally {
        setIsLoading(false);
      }
    },
    [endpoint, projectId, worklogId]
  );

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  return { update, isLoading, error, clearError };
}


