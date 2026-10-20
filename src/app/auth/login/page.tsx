"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Clock, Eye, EyeOff, Lock, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { login } from "@/features/auth/api/login";
import { logout } from "@/features/auth/api/logout";
import { getMe } from "@/features/auth/api/getMe";
import { loginErrorCopy } from "@/features/auth/lib/loginErrors";
import { resolveSignIn } from "@/features/auth/lib/signIn";
import { loginSchema, type LoginFormValues } from "@/features/auth/schemas/login.schema";
import { clearSession, saveSession } from "@/lib/auth/session";
import { REASON_PARAM, REDIRECT_PARAM, afterLoginPath } from "@/features/auth/lib/loginRedirect";

/** What the page says for a Staff account (SPEC 1.1). */
function staffMessage(): string {
  const { title, description } = loginErrorCopy("staff");
  return `${title}. ${description}`;
}

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  // The page is prerendered: until React has taken over, a press of Login (or
  // Enter) would submit the bare HTML form and put the password in the address
  // bar. Login stays disabled until then, which also blocks Enter.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  // Arriving from the portal with a Staff session: say why, once.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get(REASON_PARAM) === "staff") {
      setServerError(staffMessage());
    }
  }, []);

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

      // The role, organisation and grants come from GET /me, not the sign-in answer.
      const outcome = await resolveSignIn(data.user, getMe);
      if (!outcome.ok) {
        // Staff use the RX Vision app: end the session the password just opened.
        void logout();
        clearSession();
        const { title, description, duration } = loginErrorCopy(
          outcome.reason === "staff" ? "staff" : "unknown",
        );
        setServerError(`${title}. ${description}`);
        toast.error(title, { description, duration });
        return;
      }

      saveSession(outcome.session);
      toast.success("Login successful", {
        description: "Redirecting you to your dashboard…",
      });
      // Back to the page that asked for a sign-in (?redirect=), when it is a
      // dashboard page this role may open; otherwise home.
      const redirect = new URLSearchParams(window.location.search).get(REDIRECT_PARAM);
      window.location.href = afterLoginPath(redirect, outcome.role, outcome.session.user?.grants);
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
          {/* The dashboard's brand mark: public/brand has no logo image to load. */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[rgb(74_74_230)] to-[rgb(34_34_204)] text-white shadow-sm shadow-[rgba(34,34,204,0.35)]">
              <Clock className="h-6 w-6" aria-hidden />
            </span>
            <span className="text-xl font-bold tracking-tight text-slate-900">Rx Vision</span>
          </div>

          <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">Sign in</h1>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Welcome back! Please enter your credentials
              <br />
              to access your account.
            </p>

            {serverError && (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
                {serverError}
              </div>
            )}

            <form
              method="post"
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="mt-10 space-y-8"
            >
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
                disabled={isSubmitting || !hydrated}
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
              alt="Rx Vision illustration"
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
