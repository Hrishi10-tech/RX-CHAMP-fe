"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Lock, Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { login } from "@/features/auth/api/login";
import { logout } from "@/features/auth/api/logout";
import { getMe } from "@/features/auth/api/getMe";
import { loginErrorCopy } from "@/features/auth/lib/loginErrors";
import { resolveSignIn } from "@/features/auth/lib/signIn";
import { loginSchema, type LoginFormValues } from "@/features/auth/schemas/login.schema";
import { clearSession, saveSession } from "@/lib/auth/session";
import { BRAND } from "@/lib/brand";
import { Checkbox } from "@/components/ui/Field";
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
    <main className="min-h-screen w-full bg-panel">
      <div className="grid min-h-screen w-full bg-panel lg:grid-cols-2">
        <div className="flex flex-col px-8 py-10 sm:px-14 sm:py-12 lg:order-2">
          {/* The menu's brand mark (the agent's round RX mark), or this deployment's logo. */}
          <div className="flex items-center gap-2.5 lg:hidden">
            {BRAND.mark ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={BRAND.mark} alt="" width={44} height={44} className="h-11 w-11 shrink-0" />
            ) : (
              <Image
                src={BRAND.logo}
                alt=""
                aria-hidden
                width={BRAND.width}
                height={BRAND.height}
                priority
                className="h-11 w-auto shrink-0 rounded-xl"
              />
            )}
            <span className="text-xl font-bold tracking-tight text-primary">RX Vision</span>
          </div>

          <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
            <h1 className="text-4xl font-bold tracking-tight text-primary">Sign in</h1>
            <p className="mt-4 text-sm leading-6 text-soft">
              Welcome back! Please enter your credentials
              <br />
              to access your account.
            </p>

            {serverError && (
              <div
                role="alert"
                className="mt-6 rounded-lg border border-attention-edge bg-attention-wash px-3.5 py-2.5 text-sm text-attention"
              >
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
                <label htmlFor="email" className="text-xs font-medium text-quiet">
                  Email
                </label>
                <div
                  className={`mt-1.5 flex h-12 items-center gap-3 rounded-[10px] border bg-field px-3.5 transition-colors ${
                    errors.email ? "border-attention" : "border-card focus-within:border-brand"
                  }`}
                >
                  <Mail
                    className={`h-[18px] w-[18px] shrink-0 ${
                      errors.email ? "text-attention" : "text-quiet"
                    }`}
                  />
                  <input
                    id="email"
                    type="email"
                    // "username" is what password managers pair with the password below.
                    autoComplete="username"
                    spellCheck={false}
                    placeholder="Enter your email address"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "email-error" : undefined}
                    className="w-full bg-transparent text-[0.9375rem] font-medium text-primary outline-none placeholder:font-normal placeholder:text-neutral"
                    {...register("email")}
                  />
                </div>
                {errors.email && (
                  <p id="email-error" role="alert" className="mt-1.5 text-xs text-attention">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="password" className="text-xs font-medium text-quiet">
                  Password
                </label>
                <div
                  className={`mt-1.5 flex h-12 items-center gap-3 rounded-[10px] border bg-field px-3.5 transition-colors ${
                    errors.password ? "border-attention" : "border-card focus-within:border-brand"
                  }`}
                >
                  <Lock
                    className={`h-[18px] w-[18px] shrink-0 ${
                      errors.password ? "text-attention" : "text-quiet"
                    }`}
                  />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? "password-error" : undefined}
                    className="w-full bg-transparent text-[0.9375rem] font-medium text-primary outline-none placeholder:font-normal placeholder:text-neutral"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className={`-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 ${
                      errors.password ? "text-attention" : "text-quiet hover:text-soft"
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
                  <p id="password-error" role="alert" className="mt-1.5 text-xs text-attention">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-xs text-soft">
                  <Checkbox {...register("remember")} />
                  Remember me
                </label>
                <a
                  href="/auth/forgot-password"
                  className="text-xs text-quiet hover:text-body hover:underline"
                >
                  Forgot password?
                </a>
              </div>
              <button
                type="submit"
                disabled={isSubmitting || !hydrated}
                className="flex h-14 w-full items-center justify-center gap-2 rounded-[10px] bg-brand text-[0.9375rem] font-semibold text-on-brand transition hover:bg-brand-hover focus:outline-none focus:ring-4 focus:ring-brand/30 disabled:cursor-not-allowed disabled:opacity-70"
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

        {/* Agent design: the desktop app's own panel and mark, in place of the stock illustration. */}
        <div className="hidden p-6 lg:order-1 lg:block">
          <div className="flex h-full w-full flex-col items-center justify-center rounded-[20px] border border-card bg-card px-12 text-center">
            {/* The desktop agent's grey RX mark, round, as on the agent's sign-in (RxMark.cs). */}
            {BRAND.mark ? (
              <Image src={BRAND.mark} alt="RX" width={168} height={168} priority />
            ) : (
              <Image
                src={BRAND.logo}
                alt=""
                width={BRAND.width}
                height={BRAND.height}
                priority
                className="h-[168px] w-auto"
              />
            )}
            <p className="mt-8 text-[1.375rem] font-bold text-primary">
              One RX Vision on every screen
            </p>
            <p className="mt-3 max-w-sm text-[0.9375rem] leading-6 text-quiet">
              The desktop app records the day, the phone carries it with you and the portal runs the
              team. Same sign in, same look.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {["Desktop app", "Phone app", "Web portal"].map((name) => (
                <span
                  key={name}
                  className="inline-flex h-8 items-center rounded-full border border-brand bg-brand/10 px-3.5 text-[0.8125rem] font-semibold text-brand"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
