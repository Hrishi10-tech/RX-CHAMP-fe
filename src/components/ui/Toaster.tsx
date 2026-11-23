"use client";

import { CheckCircle2, AlertCircle, Info, Loader2 } from "lucide-react";
import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      gap={12}
      offset={20}
      duration={4000}
      visibleToasts={4}
      closeButton
      icons={{
        success: <CheckCircle2 className="h-5 w-5 text-working" strokeWidth={2.2} />,
        error: <AlertCircle className="h-5 w-5 text-attention" strokeWidth={2.2} />,
        info: <Info className="h-5 w-5 text-brand" strokeWidth={2.2} />,
        loading: <Loader2 className="h-5 w-5 animate-spin text-quiet" strokeWidth={2.2} />,
      }}
      toastOptions={{
        classNames: {
          toast: [
            "group pointer-events-auto flex w-full items-start gap-3",
            "rounded-2xl border border-card/80 bg-card/95 p-4 pr-9",
            "shadow-[0_8px_30px_-6px_rgb(var(--c-scrim)/0.18)] backdrop-blur-sm",
            "ring-1 ring-scrim/[0.02]",
          ].join(" "),
          icon: "mt-0.5 shrink-0",
          content: "flex flex-col gap-0.5",
          title: "text-sm font-semibold leading-5 text-primary",
          description: "text-[0.8125rem] leading-5 text-quiet",
          closeButton: [
            "!left-auto !right-2.5 !top-2.5 !h-6 !w-6 !rounded-lg",
            "!border-0 !bg-transparent !text-quiet !opacity-100",
            "transition hover:!bg-panel hover:!text-body",
          ].join(" "),
          actionButton: [
            "!ml-auto !h-8 !shrink-0 !self-center !rounded-lg !bg-brand !px-3",
            "!text-xs !font-semibold !text-on-brand hover:!bg-brand-hover",
          ].join(" "),
          success: "border-l-4 !border-l-working",
          error: "border-l-4 !border-l-attention",
          info: "border-l-4 !border-l-brand",
          loading: "border-l-4 !border-l-edge-strong",
        },
      }}
    />
  );
}
