"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useRegister, type RegisterPayload } from "@/hooks/use-register";

const ROUTES = {
  LOGIN: "/login",
} as const;

enum RegisterStatus {
  Idle = "IDLE",
  Loading = "LOADING",
  Success = "SUCCESS",
  Error = "ERROR",
}

const passwordSchema = z
  .string()
  .min(8, "Minimal 8 karakter")
  .regex(/[a-z]/, "Harus mengandung huruf kecil")
  .regex(/[A-Z]/, "Harus mengandung huruf besar")
  .regex(/[0-9]/, "Harus mengandung angka");

const schema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(3, "Nama minimal 3 karakter")
      .max(100, "Nama maksimal 100 karakter"),
    email: z
      .string()
      .trim()
      .min(1, "Email wajib diisi")
      .email("Format email tidak valid")
      .transform((v) => v.toLowerCase()),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((vals) => vals.password === vals.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function RegisterForm() {
  const router = useRouter();
  const { registerAccount, isLoading, error, clearError } = useRegister();
  const [status, setStatus] = useState<RegisterStatus>(RegisterStatus.Idle);

  const defaultValues = useMemo<FormValues>(
    () => ({ fullName: "", email: "", password: "", confirmPassword: "" }),
    []
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onChange",
    reValidateMode: "onChange",
  });

  const onSubmit = useCallback(
    async (values: FormValues) => {
      clearError();
      setStatus(RegisterStatus.Loading);
      const payload: RegisterPayload = {
        fullName: values.fullName,
        email: values.email,
        password: values.password,
      };
      const result = await registerAccount(payload);
      if (!result.ok) {
        setStatus(RegisterStatus.Error);
        return;
      }
      setStatus(RegisterStatus.Success);
      setTimeout(() => {
        router.replace(ROUTES.LOGIN);
      }, 1200);
    },
    [clearError, registerAccount, router]
  );

  const showError = !!error && status !== RegisterStatus.Success;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 py-12">
      <div className="grid gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Devlog</h1>
        <p className="text-muted-foreground text-sm">Buat akun baru</p>
      </div>

      {showError && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {status === RegisterStatus.Success && (
        <Alert>
          <AlertDescription className="flex items-center gap-2">
            <CheckCircle2 />
            Account created successfully. Please login.
          </AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nama Lengkap</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="John Doe"
                    autoComplete="name"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kata Sandi</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Konfirmasi Kata Sandi</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="new-password"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" />
                Mendaftar...
              </>
            ) : (
              "Daftar"
            )}
          </Button>
        </form>
      </Form>

      <p className="text-muted-foreground text-sm text-center">
        Sudah punya akun?{" "}
        <Link
          className="text-primary underline-offset-4 hover:underline"
          href={ROUTES.LOGIN}
        >
          Masuk
        </Link>
      </p>
    </div>
  );
}
