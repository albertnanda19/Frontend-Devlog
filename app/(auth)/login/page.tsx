"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Loader2 } from "lucide-react";

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
import { useLogin, type LoginPayload, Role } from "@/hooks/use-auth";

const ROUTES = {
  DASHBOARD: "/dashboard",
  ADMIN: "/admin",
  REGISTER: "/register",
} as const;

const schema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email wajib diisi")
    .email("Format email tidak valid"),
  password: z.string().min(1, "Kata sandi wajib diisi"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useLogin();

  const defaultValues = useMemo<FormValues>(
    () => ({ email: "", password: "" }),
    []
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onTouched",
    reValidateMode: "onBlur",
  });

  const onSubmit = useCallback(
    async (values: FormValues) => {
      clearError();
      const payload: LoginPayload = {
        email: values.email,
        password: values.password,
      };
      const result = await login(payload);
      if (!result.ok) return;
      const { role } = result.data;
      if (role === Role.ADMIN) {
        router.replace(ROUTES.ADMIN);
      } else {
        router.replace(ROUTES.DASHBOARD);
      }
    },
    [clearError, login, router]
  );

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 py-12">
      <div className="grid gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Devlog</h1>
        <p className="text-muted-foreground text-sm">Masuk ke akun Anda</p>
      </div>

      {!!error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
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
                    autoFocus
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
                    autoComplete="current-password"
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
                Memproses...
              </>
            ) : (
              "Masuk"
            )}
          </Button>
        </form>
      </Form>

      <p className="text-muted-foreground text-sm text-center">
        Belum punya akun?{" "}
        <Link
          className="text-primary underline-offset-4 hover:underline"
          href={ROUTES.REGISTER}
        >
          Daftar
        </Link>
      </p>
    </div>
  );
}
