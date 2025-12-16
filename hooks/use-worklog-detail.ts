import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_HOST, COOKIE, Role } from "./use-auth";
import type { WorklogItem } from "./use-dashboard";

export interface WorklogDetailResponse {
  success: boolean;
  message?: string;
  data: WorklogItem & {
    project: { id: string; title: string };
    updatedAt?: string;
  };
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

function getRole(): Role | null {
  const value = getCookie(COOKIE.ROLE);
  if (!value) return null;
  return (value as Role) || null;
}

export function useWorklogDetail(
  projectId: string | undefined,
  worklogId: string | undefined
) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [notFound, setNotFound] = useState(false);
  const [data, setData] = useState<WorklogDetailResponse["data"] | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const endpoint = useMemo(() => {
    if (!projectId || !worklogId) return "";
    return `${API_HOST}/projects/${encodeURIComponent(
      projectId
    )}/worklogs/${encodeURIComponent(worklogId)}`;
  }, [projectId, worklogId]);

  const canManage = useMemo(() => {
    const role = getRole();
    return role === Role.ADMIN;
  }, []);

  const load = useCallback(async () => {
    if (!projectId || !worklogId) {
      setLoading(false);
      setError("Parameter tidak valid.");
      setData(null);
      return;
    }

    setLoading(true);
    setError("");
    setNotFound(false);

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
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      const status = res.status;
      const contentType = res.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      const body = (isJson ? await res.json() : null) as
        | WorklogDetailResponse
        | null;

      if (!res.ok) {
        if (status === 404) {
          if (abortRef.current === controller) {
            setNotFound(true);
            setData(null);
          }
          return;
        }
        const msg =
          (body as { message?: string } | null)?.message ||
          `Request failed: ${status}`;
        throw new Error(msg);
      }

      if (abortRef.current === controller) {
        setData(body?.data || null);
      }
    } catch (err) {
      if (controller.signal.aborted || abortRef.current !== controller) {
        return;
      }
      setError("Gagal memuat worklog. Coba lagi.");
      setData(null);
    } finally {
      if (abortRef.current === controller) {
        setLoading(false);
      }
    }
  }, [endpoint, projectId, worklogId]);

  const remove = useCallback(async (): Promise<{ ok: boolean; message: string }> => {
    if (!projectId || !worklogId) {
      return { ok: false, message: "Parameter tidak valid." };
    }
    const token = getCookie(COOKIE.ACCESS_TOKEN);
    if (!API_HOST || !token) {
      const msg = "Sesi tidak valid. Silakan login kembali.";
      setError(msg);
      return { ok: false, message: msg };
    }
    try {
      const res = await fetch(endpoint, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
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
      return { ok: true, message: body?.message || "Berhasil menghapus worklog" };
    } catch {
      return { ok: false, message: "Gagal menghapus worklog. Coba lagi." };
    }
  }, [endpoint, projectId, worklogId]);

  useEffect(() => {
    void load();
    return () => abortRef.current?.abort();
  }, [load]);

  return { loading, error, notFound, data, reload: load, remove, canManage };
}


