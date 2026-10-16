"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Loader2,
  Printer,
} from "lucide-react";
import { toast } from "sonner";

import { btnSecondary, btnSmall } from "@/components/ui/classes";
import { errorMessage } from "@/lib/api";
import { formatDayLong } from "@/lib/time/months";
import { hmOf, todayKey } from "@/lib/time/businessTime";

export interface Crumb {
  label: string;
  href?: string;
}

export interface Stepper {
  label: string;
  prevLabel: string;
  nextLabel: string;
  onPrev?: () => void;
  onNext?: () => void;
}

const stepBtn =
  "flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(34,34,204,0.35)] disabled:cursor-not-allowed disabled:opacity-40";

/** Download PDF: the browser's print dialog over the A4 print layout. */
export function PrintButton({ disabled }: { disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      disabled={disabled}
      className={btnSecondary}
    >
      <Printer className="h-4 w-4" aria-hidden />
      Download PDF
    </button>
  );
}

/** Excel for payroll: downloads the server's .xlsx under the server's file name. */
export function ExcelButton({
  download,
  disabled,
  small = false,
  label = "Excel for payroll",
}: {
  download: () => Promise<string>;
  disabled?: boolean;
  /** The compact button used in lists. */
  small?: boolean;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    try {
      const name = await download();
      toast.success("Excel downloaded", { description: name });
    } catch (err) {
      toast.error("Couldn't download the Excel file", {
        description: errorMessage(err) ?? "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  }
  return (
    <button
      type="button"
      onClick={run}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={small ? btnSmall : btnSecondary}
    >
      {busy ? (
        <Loader2
          className={small ? "h-3.5 w-3.5 animate-spin" : "h-4 w-4 animate-spin"}
          aria-hidden
        />
      ) : (
        <FileSpreadsheet className={small ? "h-3.5 w-3.5" : "h-4 w-4"} aria-hidden />
      )}
      {busy ? "Preparing…" : label}
    </button>
  );
}

/**
 * The frame of every report: breadcrumb, title, a step back or forward through
 * days or months, and the actions. Everything but the report itself is hidden
 * when printing; a one-line print header takes the breadcrumb's place. With
 * `autoPrint` (the monthly list's PDF link) the print dialog opens once the
 * report has loaded.
 */
export function ReportShell({
  crumbs,
  back,
  title,
  subtitle,
  stepper,
  actions,
  autoPrint = false,
  ready = false,
  children,
}: {
  crumbs: Crumb[];
  back?: { href: string; label: string } | null;
  title: string;
  subtitle?: ReactNode;
  stepper?: Stepper;
  actions?: ReactNode;
  autoPrint?: boolean;
  ready?: boolean;
  children: ReactNode;
}) {
  const printed = useRef(false);
  useEffect(() => {
    if (!autoPrint || !ready || printed.current) return;
    printed.current = true;
    // Give the charts a frame to lay out before the print snapshot.
    const t = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(t);
  }, [autoPrint, ready]);

  const now = new Date().toISOString();

  return (
    <div className="space-y-5 print:space-y-4">
      <div className="space-y-3 print:hidden">
        {back && (
          <Link
            href={back.href}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {back.label}
          </Link>
        )}
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm">
          {crumbs.map((c, i) => (
            <span key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-1.5">
              {i > 0 && (
                <span aria-hidden className="text-slate-300">
                  /
                </span>
              )}
              {c.href ? (
                <Link
                  href={c.href}
                  className="font-medium text-[rgb(34_34_204)] underline-offset-2 hover:underline"
                >
                  {c.label}
                </Link>
              ) : (
                <span className="truncate font-semibold text-slate-700" aria-current="page">
                  {c.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      </div>

      <p className="hidden text-xs text-slate-500 print:block">
        RX Vision report · printed {formatDayLong(todayKey())}, {hmOf(now)}
      </p>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <header className="min-w-0">
          <h1 className="break-words text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 break-words text-sm text-slate-500">{subtitle}</p>}
        </header>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end print:hidden">
          {stepper && (
            <div className="flex items-center justify-between gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={stepper.onPrev}
                disabled={!stepper.onPrev}
                aria-label={stepper.prevLabel}
                className={stepBtn}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <span className="min-w-[8.5rem] px-1 text-center text-sm font-semibold text-slate-800">
                {stepper.label}
              </span>
              <button
                type="button"
                onClick={stepper.onNext}
                disabled={!stepper.onNext}
                aria-label={stepper.nextLabel}
                className={stepBtn}
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          )}
          {actions && <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">{actions}</div>}
        </div>
      </div>

      {children}
    </div>
  );
}
