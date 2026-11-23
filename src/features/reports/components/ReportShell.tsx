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

import { errorMessage } from "@/lib/api";
import { formatDayLong } from "@/lib/time/months";
import { todayKey } from "@/lib/time/businessTime";
import { formatTime12 } from "@/lib/time/format";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";

/** Where a header action renders its notices, under the header rather than beside it. */
export const REPORT_NOTICES_ID = "report-notices";

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

/** Download PDF: the browser's print dialog over the A4 print layout. */
export function PrintButton({ disabled }: { disabled?: boolean }) {
  return (
    <Button variant="secondary" type="button" onClick={() => window.print()} disabled={disabled}>
      <Printer className="h-4 w-4" aria-hidden />
      Download PDF
    </Button>
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
    <Button
      variant={small ? "small" : "secondary"}
      type="button"
      onClick={run}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
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
    </Button>
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
            className="inline-flex items-center gap-1.5 text-sm font-medium text-quiet hover:text-body"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {back.label}
          </Link>
        )}
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm">
          {crumbs.map((c, i) => (
            <span key={`${c.label}-${i}`} className="flex min-w-0 items-center gap-1.5">
              {i > 0 && (
                <span aria-hidden className="text-faint">
                  /
                </span>
              )}
              {c.href ? (
                <Link
                  href={c.href}
                  className="font-medium text-brand underline-offset-2 hover:underline"
                >
                  {c.label}
                </Link>
              ) : (
                <span className="truncate font-semibold text-body" aria-current="page">
                  {c.label}
                </span>
              )}
            </span>
          ))}
        </nav>
      </div>

      <p className="hidden text-xs text-quiet print:block">
        RX Vision report · printed {formatDayLong(todayKey())}, {formatTime12(now)}
      </p>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <header className="min-w-0">
          <h1 className="break-words text-2xl font-bold tracking-tight text-primary">{title}</h1>
          {subtitle && <p className="mt-1 break-words text-sm text-quiet">{subtitle}</p>}
        </header>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end print:hidden">
          {stepper && (
            <div className="flex items-center justify-between gap-1 rounded-xl border border-card bg-card p-1 shadow-sm">
              <IconButton
                onClick={stepper.onPrev}
                disabled={!stepper.onPrev}
                label={stepper.prevLabel}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </IconButton>
              <span className="min-w-[8.5rem] px-1 text-center text-sm font-semibold text-strong">
                {stepper.label}
              </span>
              <IconButton
                onClick={stepper.onNext}
                disabled={!stepper.onNext}
                label={stepper.nextLabel}
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </IconButton>
            </div>
          )}
          {actions && <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">{actions}</div>}
        </div>
      </div>

      {/* 3.6 (W-08): what an action has to say (the month lock's blockers) goes here, full width. */}
      <div id={REPORT_NOTICES_ID} className="empty:hidden print:hidden" />

      {children}
    </div>
  );
}
