import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_HOST, COOKIE } from "./use-auth";

export interface UserInfo {
  id: string;
  email: string;
  fullName: string;
  role: { id: string; name: string };
  isActive: boolean;
  createdAt: string;
}

export interface ProjectItem {
  id: string;
  title: string;
  description: string;
  techStack: string;
  status: string;
  createdAt: string;
}

export interface ProjectsResponse {
  success: boolean;
  message?: string;
  data: ProjectItem[];
  meta?: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface WorklogItem {
  id: string;
  logDate: string; // YYYY-MM-DD
  activityType: string;
  summary: string;
  timeSpent: number; // minutes
  blockers: string;
  createdAt: string;
  projectId?: string;
}

export interface WorklogsResponse {
  success: boolean;
  message?: string;
  data: WorklogItem[];
  meta?: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}

export type DashboardData = {
  me: UserInfo | null;
  projects: ProjectsResponse | null;
  recentWorklogs: WorklogItem[]; // aggregated top 5 by createdAt across first 5 projects
  totals: {
    totalProjects: number;
    worklogsThisWeek: number;
  };
};

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

export function useDashboardData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [data, setData] = useState<DashboardData | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const endpoints = useMemo(() => {
    return {
      me: `${API_HOST}/auth/me`,
      projects: `${API_HOST}/projects?limit=5`,
      worklogs: (projectId: string) =>
        `${API_HOST}/projects/${projectId}/worklogs?limit=5`,
    } as const;
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
      // Fetch user and projects in parallel
      const [meResp, projResp] = await Promise.all([
        fetchWithAuth<{ success: boolean; data: UserInfo }>(
          endpoints.me,
          token,
          controller.signal
        ),
        fetchWithAuth<ProjectsResponse>(
          endpoints.projects,
          token,
          controller.signal
        ),
      ]);

      const projects = projResp?.data || [];

      // Fetch worklogs for each project (limit=5 each), then aggregate top 5 by createdAt
      const worklogLists = await Promise.all(
        projects.map((p) =>
          fetchWithAuth<WorklogsResponse>(
            endpoints.worklogs(p.id),
            token,
            controller.signal
          )
            .then((w) =>
              (w?.data || []).map((it) => ({ ...it, projectId: p.id }))
            )
            .catch(() => [])
        )
      );
      const allWorklogs = worklogLists.flat();
      const recentWorklogs = allWorklogs
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 5);

      // Compute summaries
      const totalProjects = projResp?.meta?.totalItems ?? projects.length;
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const worklogsThisWeek = allWorklogs.filter(
        (w) => new Date(w.logDate) >= weekAgo
      ).length;

      setData({
        me: meResp?.data ?? null,
        projects: projResp ?? null,
        recentWorklogs,
        totals: {
          totalProjects,
          worklogsThisWeek,
        },
      });
    } catch {
      setError("Gagal memuat dashboard. Coba lagi.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [endpoints]);

  useEffect(() => {
    void load();
    return () => abortRef.current?.abort();
  }, [load]);

  return { loading, error, data, reload: load };
}
