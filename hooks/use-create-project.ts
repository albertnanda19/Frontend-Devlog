import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_HOST, COOKIE } from "./use-auth";
import { ProjectStatus } from "./use-project-detail";

export interface CreateProjectPayload {
  title: string;
  description?: string;
  techStack?: string;
  status?: ProjectStatus; // defaults to ACTIVE
}

export interface CreateProjectSuccess {
  success: true;
  message?: string;
  data: {
    id: string;
    title: string;
    description?: string;
    techStack?: string;
    status: string;
    createdAt: string;
  };
}

export type CreateProjectResult =
  | { ok: true; data: CreateProjectSuccess }
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

export function useCreateProject() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const abortRef = useRef<AbortController | null>(null);

  const endpoint = useMemo(() => `${API_HOST}/projects`, []);

  const clearError = useCallback(() => setError(""), []);

  const create = useCallback(
    async (payload: CreateProjectPayload): Promise<CreateProjectResult> => {
      if (!API_HOST) {
        const msg = "Konfigurasi API tidak ditemukan.";
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
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: payload.title.trim(),
            description:
              payload.description && payload.description.trim().length > 0
                ? payload.description.trim()
                : undefined,
            techStack:
              payload.techStack && payload.techStack.trim().length > 0
                ? payload.techStack.trim()
                : undefined,
            status: payload.status || ProjectStatus.ACTIVE,
          }),
          signal: controller.signal,
        });

        const contentType = res.headers.get("content-type") || "";
        const isJson = contentType.includes("application/json");
        const body = (isJson ? await res.json() : null) as
          | CreateProjectSuccess
          | { success?: boolean; message?: string }
          | null;

        if (!res.ok) {
          const msg =
            (body as { message?: string } | null)?.message ||
            `Gagal membuat project (${res.status}).`;
          setError(msg);
          return { ok: false, error: msg };
        }

        return { ok: true, data: body as CreateProjectSuccess };
      } catch {
        if (controller.signal.aborted) {
          return { ok: false, error: "Dibatalkan." };
        }
        const msg = "Gagal membuat project. Coba lagi.";
        setError(msg);
        return { ok: false, error: msg };
      } finally {
        setIsLoading(false);
      }
    },
    [endpoint]
  );

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  return { create, isLoading, error, clearError };
}


