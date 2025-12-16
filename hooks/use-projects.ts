import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_HOST, COOKIE } from "./use-auth";
import type { ProjectsResponse } from "./use-dashboard";

export type ProjectStatusFilter = "ALL" | "ACTIVE" | "ARCHIVED";

export interface ProjectsQuery {
  search?: string;
  status?: ProjectStatusFilter;
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

export function useProjects(
  initial: ProjectsQuery = { page: 1, limit: 10, status: "ALL" }
) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [data, setData] = useState<ProjectsResponse | null>(null);
  const [query, setQuery] = useState<ProjectsQuery>(initial);
  const abortRef = useRef<AbortController | null>(null);

  const endpoint = useMemo(() => `${API_HOST}/projects`, []);

  const setParams = useCallback((next: Partial<ProjectsQuery>) => {
    setQuery((prev) => ({ ...prev, ...next }));
  }, []);

  const load = useCallback(async () => {
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
      if (query.search && query.search.trim().length > 0)
        params.set("search", query.search.trim());
      if (query.status && query.status !== "ALL")
        params.set("status", query.status);
      if (query.page && query.page > 1) params.set("page", String(query.page));
      if (query.limit && query.limit !== 10)
        params.set("limit", String(query.limit));

      const url = params.toString().length
        ? `${endpoint}?${params.toString()}`
        : endpoint;
      const resp = await fetchWithAuth<ProjectsResponse>(
        url,
        token,
        controller.signal
      );
      // Only commit data if this is the latest in-flight request
      if (abortRef.current === controller) {
        setData(resp);
      }
    } catch (err) {
      // Ignore abort errors and stale requests
      if (controller.signal.aborted || abortRef.current !== controller) {
        return;
      }
      setError("Gagal memuat projects. Coba lagi.");
      setData(null);
    } finally {
      // Only toggle loading if this is the latest in-flight request
      if (abortRef.current === controller) {
        setLoading(false);
      }
    }
  }, [endpoint, query]);

  const remove = useCallback(
    async (id: string): Promise<{ ok: boolean; message: string }> => {
      const token = getCookie(COOKIE.ACCESS_TOKEN);
      if (!API_HOST || !token) {
        const msg = "Sesi tidak valid. Silakan login kembali.";
        setError(msg);
        return { ok: false, message: msg };
      }

      try {
        const url = `${endpoint}/${encodeURIComponent(id)}`;
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
          const msg =
            body?.message || `Gagal menghapus project (${res.status}).`;
          return { ok: false, message: msg };
        }

        // Optimistic update: remove from current data page
        setData((prev) => {
          if (!prev) return prev;
          const nextItems = (prev.data || []).filter((p) => p.id !== id);
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
                          Math.max(0, prev.meta.totalItems - 1) /
                            prev.meta.limit
                        )
                      )
                    : prev.meta.totalPages,
              }
            : prev.meta;
          return { ...prev, data: nextItems, meta: nextMeta };
        });

        return {
          ok: true,
          message: body?.message || "Berhasil menghapus project",
        };
      } catch {
        return { ok: false, message: "Gagal menghapus project. Coba lagi." };
      }
    },
    [endpoint]
  );

  useEffect(() => {
    void load();
    return () => abortRef.current?.abort();
  }, [load]);

  return { loading, error, data, query, setParams, reload: load, remove };
}
