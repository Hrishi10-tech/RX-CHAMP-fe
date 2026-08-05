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
        success: <CheckCircle2 className="h-5 w-5 text-emerald-500" strokeWidth={2.2} />,
        error: <AlertCircle className="h-5 w-5 text-rose-500" strokeWidth={2.2} />,
        info: <Info className="h-5 w-5 text-[rgb(34_34_204)]" strokeWidth={2.2} />,
        loading: <Loader2 className="h-5 w-5 animate-spin text-slate-400" strokeWidth={2.2} />,
      }}
      toastOptions={{
        classNames: {
          toast: [
            "group pointer-events-auto flex w-full items-start gap-3",
            "rounded-2xl border border-slate-200/80 bg-white/95 p-4 pr-9",
            "shadow-[0_8px_30px_-6px_rgba(15,23,42,0.18)] backdrop-blur-sm",
            "ring-1 ring-black/[0.02]",
          ].join(" "),
          icon: "mt-0.5 shrink-0",
          content: "flex flex-col gap-0.5",
          title: "text-sm font-semibold leading-5 text-slate-900",
          description: "text-[13px] leading-5 text-slate-500",
          closeButton: [
            "!left-auto !right-2.5 !top-2.5 !h-6 !w-6 !rounded-lg",
            "!border-0 !bg-transparent !text-slate-400 !opacity-100",
            "transition hover:!bg-slate-100 hover:!text-slate-700",
          ].join(" "),
          success: "border-l-4 !border-l-emerald-500",
          error: "border-l-4 !border-l-rose-500",
          info: "border-l-4 !border-l-[rgb(34_34_204)]",
          loading: "border-l-4 !border-l-slate-300",
        },
      }}
    />
  );
}
