"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download, Laptop, Loader2, Monitor, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { Modal } from "@/components/ui/Modal";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { btnPrimary, btnSecondary } from "@/components/ui/classes";
import { errorMessage } from "@/lib/api";
import { downloadAgentForUser, downloadAgentInstaller } from "@/features/agent/api/downloadAgent";
import { useAgentVersion, useSetupCode } from "@/features/agent/hooks/useAgent";
import { agentDownloadName, formatBytes } from "@/features/agent/lib/fileName";
import type { AgentPlatform, AgentVersionInfo } from "@/features/agent/types";

const PLATFORMS: { value: AgentPlatform; label: string }[] = [
  { value: "windows", label: "Windows" },
  { value: "mac", label: "Mac (Apple Silicon)" },
  { value: "mac-x64", label: "Mac (Intel)" },
];

function VersionLine({
  info,
  loading,
  failed,
}: {
  info?: AgentVersionInfo;
  loading: boolean;
  failed: boolean;
}) {
  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Checking the latest version…
      </p>
    );
  }
  if (failed || !info) {
    return (
      <p className="text-sm text-rose-600">Couldn&apos;t check this download. Try again later.</p>
    );
  }
  if (!info.available) {
    return (
      <p className="text-sm font-medium text-amber-700">This build isn&apos;t on the server yet.</p>
    );
  }
  const parts = [
    info.version ? `Version ${info.version}` : null,
    formatBytes(info.sizeBytes) || null,
  ]
    .filter(Boolean)
    .join(" · ");
  return <p className="text-sm text-slate-500">{parts || "Ready to download."}</p>;
}

function SetupCode({ userId, userName }: { userId: string; userName: string }) {
  const { data, isLoading, isError, error, refetch, isFetching } = useSetupCode(userId, true);
  const [copied, setCopied] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  async function copy() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.code);
      setCopied(true);
    } catch {
      // No clipboard permission (or not a secure context): select it for a manual copy.
      textRef.current?.select();
      toast.info("Press Ctrl+C (or Cmd+C) to copy the selected code.");
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor="agent-setup-code" className="text-sm font-semibold text-slate-700">
          Setup code
        </label>
        <button
          type="button"
          onClick={copy}
          disabled={!data}
          className={`${btnSecondary} px-3 py-1.5 text-[13px]`}
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-600" aria-hidden />
          ) : (
            <Copy className="h-4 w-4" aria-hidden />
          )}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {isLoading ? (
        <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Getting a code…
        </p>
      ) : isError ? (
        <div className="mt-2 text-sm text-rose-600">
          {errorMessage(error) ?? "Couldn't get a setup code."}{" "}
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="font-semibold underline"
          >
            Try again
          </button>
        </div>
      ) : (
        <textarea
          id="agent-setup-code"
          ref={textRef}
          readOnly
          rows={3}
          value={data?.code ?? ""}
          onFocus={(e) => e.currentTarget.select()}
          className="mt-2 w-full resize-none break-all rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-700 outline-none focus:border-[rgb(34_34_204)] focus:ring-2 focus:ring-[rgba(34,34,204,0.15)]"
        />
      )}
      <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-500">
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
        Anyone with this code can sign the app in as {userName}. Share it only with them.
      </p>
    </div>
  );
}

/**
 * Get the desktop app for one person: a Windows installer that signs itself in,
 * or the Mac app plus a setup code (a Mac app can't carry a per-person sign-in).
 * For yourself (`self`) the plain app, which signs in with your email and
 * password: the API issues installers and setup codes only for other people.
 */
export function DownloadAgentDialog({
  open,
  onClose,
  userId,
  userName,
  self = false,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  self?: boolean;
}) {
  const [platform, setPlatform] = useState<AgentPlatform>("windows");
  const [downloading, setDownloading] = useState(false);
  const version = useAgentVersion(platform, open);
  const isMac = platform !== "windows";

  useEffect(() => {
    if (open) setPlatform("windows");
  }, [open]);

  async function download() {
    const info = version.data;
    const fileName = agentDownloadName(platform, self ? null : userName, info?.fileName);
    setDownloading(true);
    try {
      if (self) await downloadAgentInstaller(fileName, platform);
      else await downloadAgentForUser(userId, fileName, platform);
      toast.success("Download started", { description: fileName });
    } catch (err) {
      toast.error("Couldn't download the app", {
        description: errorMessage(err) ?? "Please try again.",
      });
    } finally {
      setDownloading(false);
    }
  }

  const canDownload = Boolean(version.data?.available) && !downloading;

  return (
    <Modal
      open={open}
      onClose={downloading ? () => {} : onClose}
      title="Get the desktop app"
      description={
        self ? "For this computer: you sign in with your email and password." : `For ${userName}.`
      }
      className="max-w-lg"
    >
      <div className="space-y-4 px-6 py-5">
        <SegmentedTabs
          label="Computer"
          tabs={PLATFORMS}
          value={platform}
          onChange={setPlatform}
          size="sm"
          idPrefix="agent-platform"
        />

        <div
          id="agent-platform-panel"
          role="tabpanel"
          aria-labelledby={`agent-platform-tab-${platform}`}
          className="space-y-4"
        >
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(34,34,204,0.1)] text-[rgb(34_34_204)]">
              {isMac ? (
                <Laptop className="h-5 w-5" aria-hidden />
              ) : (
                <Monitor className="h-5 w-5" aria-hidden />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">
                {isMac
                  ? `RX Vision for ${platform === "mac" ? "Apple Silicon Macs (M1 and later)" : "Intel Macs"}`
                  : "RX Vision for Windows"}
              </p>
              <VersionLine
                info={version.data}
                loading={version.isLoading}
                failed={version.isError}
              />
            </div>
          </div>

          {isMac ? (
            <>
              <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-600 marker:font-semibold marker:text-slate-400">
                <li>Download the app, open the zip and move RX Vision to Applications.</li>
                <li>
                  First launch: right-click RX Vision and choose Open. If macOS still blocks it,
                  open System Settings &gt; Privacy &amp; Security and click Open Anyway.
                </li>
                <li>
                  {self
                    ? "On the sign-in screen, sign in with your email and password."
                    : "On the sign-in screen, paste the setup code below."}
                </li>
                <li>Allow Screen Recording when macOS asks.</li>
              </ol>
              {!self && <SetupCode userId={userId} userName={userName} />}
            </>
          ) : self ? (
            <p className="text-sm leading-relaxed text-slate-600">
              This installer opens the RX Vision sign-in screen. Sign in with your email and
              password.
            </p>
          ) : (
            <p className="text-sm leading-relaxed text-slate-600">
              This installer signs in as {userName} by itself. Send it to them and they run it. No
              password needed.
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={downloading} className={btnSecondary}>
            Done
          </button>
          <button type="button" onClick={download} disabled={!canDownload} className={btnPrimary}>
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Download className="h-4 w-4" aria-hidden />
            )}
            {downloading ? "Downloading…" : isMac ? "Download for Mac" : "Download installer"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
