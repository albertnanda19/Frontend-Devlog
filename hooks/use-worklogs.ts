import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_HOST, COOKIE } from "./use-auth";
import type { WorklogsResponse } from "./use-dashboard";

export interface WorklogsQuery {
  fromDate?: string; // YYYY-MM-DD
  toDate?: string; // YYYY-MM-DD
  activityType?: string;
  page?: number;
  limit?: number;
}

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

async function fetchWithAuth<T>(
  url: string,
  token: string,
  signal: AbortSignal
): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    signal,
  });
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const body = (isJson ? await res.json() : null) as T | null;
  if (!res.ok) {
    const msg =
      (body as { message?: string } | null)?.message ||
      `Request failed: ${res.status}`;
    throw new Error(msg);
  }
  return body as T;
}

export function useWorklogs(projectId: string | undefined, initial: WorklogsQuery = { page: 1, limit: 10 }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [data, setData] = useState<WorklogsResponse | null>(null);
  const [query, setQuery] = useState<WorklogsQuery>(initial);
  const abortRef = useRef<AbortController | null>(null);

  const baseEndpoint = useMemo(() => {
    if (!projectId) return "";
    return `${API_HOST}/projects/${encodeURIComponent(projectId)}/worklogs`;
  }, [projectId]);

  const setParams = useCallback((next: Partial<WorklogsQuery>) => {
    setQuery((prev) => ({ ...prev, ...next }));
  }, []);

  const load = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      setError("ID project tidak valid.");
      setData(null);
      return;
    }

    setLoading(true);
    setError("");

    const token = getCookie(COOKIE.ACCESS_TOKEN);
    if (!API_HOST || !token) {
      setLoading(false);
      setError("Sesi tidak valid. Silakan login kembali.");
      setData(null);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const params = new URLSearchParams();
      if (query.fromDate) params.set("fromDate", query.fromDate);
      if (query.toDate) params.set("toDate", query.toDate);
      if (query.activityType && query.activityType.trim().length > 0) {
        params.set("activityType", query.activityType.trim());
      }
      if (query.page && query.page > 1) params.set("page", String(query.page));
      if (query.limit && query.limit !== 10) params.set("limit", String(query.limit));

      const url = params.toString().length
        ? `${baseEndpoint}?${params.toString()}`
        : baseEndpoint;

      const resp = await fetchWithAuth<WorklogsResponse>(url, token, controller.signal);
      if (abortRef.current === controller) {
        setData(resp);
      }
    } catch (err) {
      if (controller.signal.aborted || abortRef.current !== controller) {
        return;
      }
      setError("Gagal memuat worklogs. Coba lagi.");
      setData(null);
    } finally {
      if (abortRef.current === controller) {
        setLoading(false);
      }
    }
  }, [baseEndpoint, projectId, query]);

  const remove = useCallback(
    async (worklogId: string): Promise<{ ok: boolean; message: string }> => {
      if (!projectId) return { ok: false, message: "ID project tidak valid." };
      const token = getCookie(COOKIE.ACCESS_TOKEN);
      if (!API_HOST || !token) {
        const msg = "Sesi tidak valid. Silakan login kembali.";
        setError(msg);
        return { ok: false, message: msg };
      }
      try {
        const url = `${API_HOST}/projects/${encodeURIComponent(projectId)}/worklogs/${encodeURIComponent(worklogId)}`;
        const res = await fetch(url, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const contentType = res.headers.get("content-type") || "";
        const isJson = contentType.includes("application/json");
        const body = (isJson ? await res.json() : null) as {
          success?: boolean;
          message?: string;
        } | null;
        if (!res.ok || (body && body.success === false)) {
          const msg = body?.message || `Gagal menghapus worklog (${res.status}).`;
          return { ok: false, message: msg };
        }
        // Optimistic update
        setData((prev) => {
          if (!prev) return prev;
          const nextItems = (prev.data || []).filter((w) => w.id !== worklogId);
          const nextMeta = prev.meta
            ? {
                ...prev.meta,
                totalItems:
                  typeof prev.meta.totalItems === "number"
                    ? Math.max(0, prev.meta.totalItems - 1)
                    : prev.meta.totalItems,
                totalPages:
                  typeof prev.meta.totalItems === "number" &&
                  typeof prev.meta.limit === "number"
                    ? Math.max(
                        1,
                        Math.ceil(
                          Math.max(0, prev.meta.totalItems - 1) / prev.meta.limit
                        )
                      )
                    : prev.meta.totalPages,
              }
            : prev.meta;
          return { ...prev, data: nextItems, meta: nextMeta };
        });
        return { ok: true, message: body?.message || "Berhasil menghapus worklog" };
      } catch {
        return { ok: false, message: "Gagal menghapus worklog. Coba lagi." };
      }
    },
    [projectId]
  );

  useEffect(() => {
    void load();
    return () => abortRef.current?.abort();
  }, [load]);

  return { loading, error, data, query, setParams, reload: load, remove };
}


