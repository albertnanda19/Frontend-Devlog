import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_HOST, COOKIE, Role } from "./use-auth";
import type { ProjectItem, WorklogItem, WorklogsResponse } from "./use-dashboard";

export interface ProjectDetailResponse {
  success: boolean;
  data: ProjectItem & { updatedAt?: string };
}

export enum ProjectStatus {
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
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

export type ProjectDetailData = {
  project: (ProjectItem & { updatedAt?: string }) | null;
  worklogs: WorklogItem[];
  worklogsMeta?: WorklogsResponse["meta"];
};

export function useProjectDetail(projectId: string | undefined) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [notFound, setNotFound] = useState(false);
  const [data, setData] = useState<ProjectDetailData>({
    project: null,
    worklogs: [],
    worklogsMeta: undefined,
  });
  const abortRef = useRef<AbortController | null>(null);

  const endpoints = useMemo(() => {
    return {
      project: (id: string) => `${API_HOST}/projects/${encodeURIComponent(id)}`,
      worklogs: (id: string) =>
        `${API_HOST}/projects/${encodeURIComponent(id)}/worklogs?limit=5`,
    } as const;
  }, []);

  const canManage = useMemo(() => {
    const role = getRole();
    return role === Role.ADMIN;
  }, []);

  const load = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      setError("ID project tidak valid.");
      return;
    }

    setLoading(true);
    setError("");
    setNotFound(false);

    const token = getCookie(COOKIE.ACCESS_TOKEN);
    if (!API_HOST || !token) {
      setLoading(false);
      setError("Sesi tidak valid. Silakan login kembali.");
      setData({ project: null, worklogs: [], worklogsMeta: undefined });
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Fetch project detail first to know existence
      const projRes = await fetch(endpoints.project(projectId), {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });
      const projStatus = projRes.status;
      const isJson = (projRes.headers.get("content-type") || "").includes(
        "application/json"
      );
      const projBody = isJson
        ? ((await projRes.json()) as ProjectDetailResponse)
        : null;

      if (!projRes.ok) {
        if (projStatus === 404) {
          if (abortRef.current === controller) {
            setNotFound(true);
            setData({ project: null, worklogs: [], worklogsMeta: undefined });
          }
          return;
        }
        const msg =
          (projBody as { message?: string } | null)?.message ||
          `Request failed: ${projStatus}`;
        throw new Error(msg);
      }

      const project = projBody?.data || null;

      // In parallel: worklogs preview (errors here shouldn't fail the page)
      const [worklogsBody] = await Promise.all([
        fetch(endpoints.worklogs(projectId), {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
          .then(async (r) => {
            const isJson2 = (r.headers.get("content-type") || "").includes(
              "application/json"
            );
            if (!r.ok) return null;
            return (isJson2 ? await r.json() : null) as WorklogsResponse | null;
          })
          .catch(() => null),
      ]);

      if (abortRef.current === controller) {
        setData({
          project,
          worklogs: worklogsBody?.data || [],
          worklogsMeta: worklogsBody?.meta,
        });
      }
    } catch (err) {
      if (controller.signal.aborted || abortRef.current !== controller) {
        return;
      }
      setError("Gagal memuat project. Coba lagi.");
      setData({ project: null, worklogs: [], worklogsMeta: undefined });
    } finally {
      if (abortRef.current === controller) {
        setLoading(false);
      }
    }
  }, [endpoints, projectId]);

  const remove = useCallback(
    async (): Promise<{ ok: boolean; message: string }> => {
      if (!projectId) return { ok: false, message: "ID project tidak valid." };
      const token = getCookie(COOKIE.ACCESS_TOKEN);
      if (!API_HOST || !token) {
        const msg = "Sesi tidak valid. Silakan login kembali.";
        setError(msg);
        return { ok: false, message: msg };
      }
      try {
        const res = await fetch(endpoints.project(projectId), {
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
          const msg = body?.message || `Gagal mengarsipkan project (${res.status}).`;
          return { ok: false, message: msg };
        }
        return { ok: true, message: body?.message || "Berhasil mengarsipkan project" };
      } catch {
        return { ok: false, message: "Gagal mengarsipkan project. Coba lagi." };
      }
    },
    [endpoints, projectId]
  );

  useEffect(() => {
    void load();
    return () => abortRef.current?.abort();
  }, [load]);

  return {
    loading,
    error,
    notFound,
    data,
    reload: load,
    remove,
    canManage,
  };
}


