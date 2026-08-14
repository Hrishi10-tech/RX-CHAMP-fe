"use client";

import { useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Lock, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { login } from "@/features/auth/api/login";
import { loginErrorCopy } from "@/features/auth/lib/loginErrors";
import { loginSchema, type LoginFormValues } from "@/features/auth/schemas/login.schema";
import { saveSession } from "@/lib/auth/session";
import { setApiAuthToken } from "@/lib/api";
import { resolveHomeRoute } from "@/constants/roles";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: { email: "", password: "", remember: false },
  });

  async function onSubmit(values: LoginFormValues) {
    setServerError(null);
    try {
      const data = await login(values);
      if (!data.ok) {
        const { title, description, duration } = loginErrorCopy(data.reason, data.message);
        setServerError(`${title}. ${description}`);
        toast.error(title, { description, duration });
        return;
      }

      saveSession({ token: data.token, user: data.user });
      setApiAuthToken(data.token);
      toast.success("Login successful", {
        description: "Redirecting you to your dashboard…",
      });
      window.location.href = resolveHomeRoute(data.user?.role);
    } catch {
      setServerError("Something went wrong. Please try again.");
      toast.error("Something went wrong", {
        description: "Please try again.",
      });
    }
  }

  return (
    <main className="min-h-screen w-full bg-white">
      <div className="grid min-h-screen w-full bg-white lg:grid-cols-2">
        <div className="flex flex-col px-8 py-10 sm:px-14 sm:py-12 lg:order-2">
          <div className="flex items-center lg:hidden">
            <Image
              src="/brand/logo.png"
              alt="Rx Champ logo"
              width={1476}
              height={720}
              priority
              className="h-20 w-auto object-contain"
            />
          </div>

          <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">Sign in</h1>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Welcome back! Please enter your credentials Test 123
              <br />
              to access your account.
            </p>

            {serverError && (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-10 space-y-8">
              <div>
                <label htmlFor="email" className="text-xs font-medium text-slate-500">
                  Email
                </label>
                <div
                  className={`mt-1 flex items-center gap-3 border-b-2 pb-2 transition-colors ${
                    errors.email
                      ? "border-red-500"
                      : "border-slate-200 focus-within:border-[#2222cc]"
                  }`}
                >
                  <Mail
                    className={`h-[18px] w-[18px] shrink-0 ${
                      errors.email ? "text-red-500" : "text-slate-700"
                    }`}
                  />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="Enter your email address"
                    aria-invalid={!!errors.email}
                    className="w-full bg-transparent text-[15px] font-medium text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-700"
                    {...register("email")}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1.5 text-xs text-red-600">{errors.email.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="password" className="text-xs font-medium text-slate-500">
                  Password
                </label>
                <div
                  className={`mt-1 flex items-center gap-3 border-b-2 pb-2 transition-colors ${
                    errors.password
                      ? "border-red-500"
                      : "border-slate-200 focus-within:border-[#2222cc]"
                  }`}
                >
                  <Lock
                    className={`h-[18px] w-[18px] shrink-0 ${
                      errors.password ? "text-red-500" : "text-slate-700"
                    }`}
                  />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your Password"
                    aria-invalid={!!errors.password}
                    className="w-full bg-transparent text-[15px] font-medium text-slate-900 outline-none placeholder:font-medium placeholder:text-slate-700"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className={`shrink-0 ${
                      errors.password ? "text-red-500" : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    {showPassword ? (
                      <EyeOff className="h-[18px] w-[18px]" />
                    ) : (
                      <Eye className="h-[18px] w-[18px]" />
                    )}
                  </button>
                </div>

                {errors.password && (
                  <p className="mt-1.5 text-xs text-red-600">{errors.password.message}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-[#2222cc] accent-[#2222cc]"
                    {...register("remember")}
                  />
                  Remember me
                </label>
                <a
                  href="/auth/forgot-password"
                  className="text-xs text-slate-500 hover:text-slate-700 hover:underline"
                >
                  Forgot Password ?
                </a>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-[#2222cc] text-[15px] font-semibold text-white shadow-lg shadow-[#2222cc]/30 transition hover:bg-[#1b1ba6] focus:outline-none focus:ring-4 focus:ring-[#2222cc]/30 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  "Login"
                )}
              </button>
            </form>
          </div>
        </div>

        <div className="hidden p-6 lg:order-1 lg:block">
          <div className="relative h-full w-full overflow-hidden rounded-3xl">
            <Image
              src="/brand/login-illustration.svg"
              alt="Time Champ illustration"
              fill
              priority
              sizes="50vw"
              className="object-contain"
            />
          </div>
        </div>
      </div>
    </main>
  );
}
