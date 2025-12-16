import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export enum Role {
  ADMIN = "ADMIN",
  USER = "USER",
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginSuccess {
  success: true;
  message: string;
  access_token: string;
  refresh_token: string;
  role: Role;
}

export interface ApiErrorBody {
  message: string;
  error?: string;
  statusCode?: number;
}

export type LoginResult =
  | {
      ok: true;
      data: LoginSuccess;
    }
  | {
      ok: false;
      error: string;
    };

export const API_HOST = process.env.NEXT_PUBLIC_API_HOST as string;

const COOKIE = {
  ACCESS_TOKEN: "access_token",
  REFRESH_TOKEN: "refresh_token",
  ROLE: "role",
} as const;

function setCookie(name: string, value: string, days: number): void {
  try {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = `; expires=${date.toUTCString()}`;
    const isHttps =
      typeof window !== "undefined" && window.location.protocol === "https:";
    const secure = isHttps ? "; secure" : "";
    document.cookie = `${name}=${encodeURIComponent(
      value || ""
    )}${expires}; path=/; samesite=lax${secure}`;
  } catch {
    // Swallow cookie errors to avoid throwing in UI
  }
}

export function parseApiError(
  status: number,
  body?: ApiErrorBody | null
): string {
  if (body?.message) return body.message;
  if (status === 0) return "Tidak dapat terhubung ke server. Coba lagi.";
  if (status >= 500)
    return "Terjadi kesalahan pada server. Coba beberapa saat lagi.";
  return "Email atau kata sandi salah.";
}

export function useLogin() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const abortRef = useRef<AbortController | null>(null);

  // Ensure stable memoized endpoint
  const endpoint = useMemo(() => {
    return `${API_HOST}/auth/login`;
  }, []);

  const clearError = useCallback(() => setError(""), []);

  const login = useCallback(
    async (payload: LoginPayload): Promise<LoginResult> => {
      if (!API_HOST) {
        const msg = "Konfigurasi API tidak ditemukan.";
        setError(msg);
        return { ok: false, error: msg };
      }

      // Abort any previous request
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
          },
          body: JSON.stringify({
            email: payload.email.trim(),
            password: payload.password,
          }),
          signal: controller.signal,
        });

        const status = res.status;
        const contentType = res.headers.get("content-type") || "";
        const isJson = contentType.includes("application/json");
        const body = isJson
          ? ((await res.json()) as unknown as LoginSuccess | ApiErrorBody)
          : null;

        if (!res.ok) {
          const msg = parseApiError(status, (body as ApiErrorBody) || null);
          setError(msg);
          return { ok: false, error: msg };
        }

        const data = body as LoginSuccess;

        // Persist tokens and role in cookies for SSR-friendly usage
        setCookie(COOKIE.ACCESS_TOKEN, data.access_token, 7);
        setCookie(COOKIE.REFRESH_TOKEN, data.refresh_token, 30);
        setCookie(COOKIE.ROLE, data.role, 7);

        return { ok: true, data };
      } catch {
        const msg = "Gagal melakukan login. Periksa koneksi Anda.";
        setError(msg);
        return { ok: false, error: msg };
      } finally {
        setIsLoading(false);
      }
    },
    [endpoint]
  );

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return { login, isLoading, error, clearError };
}
