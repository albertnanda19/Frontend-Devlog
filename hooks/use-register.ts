import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { API_HOST, parseApiError, Role } from "./use-auth";

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
}

export interface RegisterSuccess {
  success: true;
  message: string;
  access_token: string;
  refresh_token: string;
  id: string;
  email: string;
  fullName: string;
  role: Role;
  createdAt: string;
}

export type RegisterResult =
  | { ok: true; data: RegisterSuccess }
  | { ok: false; error: string };

export function useRegister() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const abortRef = useRef<AbortController | null>(null);

  const endpoint = useMemo(() => `${API_HOST}/auth/register`, []);

  const clearError = useCallback(() => setError(""), []);

  const registerAccount = useCallback(
    async (payload: RegisterPayload): Promise<RegisterResult> => {
      if (!API_HOST) {
        const msg = "Konfigurasi API tidak ditemukan.";
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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: payload.email.trim().toLowerCase(),
            password: payload.password,
            full_name: payload.fullName.trim(),
          }),
          signal: controller.signal,
        });

        const status = res.status;
        const contentType = res.headers.get("content-type") || "";
        const isJson = contentType.includes("application/json");
        const body = isJson ? await res.json() : null;

        if (!res.ok) {
          const msg = parseApiError(status, body);
          setError(msg);
          return { ok: false, error: msg };
        }

        return { ok: true, data: body as RegisterSuccess };
      } catch {
        const msg = "Gagal melakukan registrasi. Periksa koneksi Anda.";
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

  return { registerAccount, isLoading, error, clearError };
}
