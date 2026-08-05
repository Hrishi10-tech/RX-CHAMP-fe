"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { Camera, RefreshCw, Search, X } from "lucide-react";
import { toast } from "sonner";

import { getScreenshots } from "@/features/screenshots/api/getScreenshots";
import { captureScreenshot } from "@/features/screenshots/api/captureScreenshot";
import type {
  KindFilter,
  RangeFilter,
  Screenshot,
  ScreenshotKind,
} from "@/features/screenshots/types";
import { Loader } from "@/components/ui/Loader";
import { ScreenshotLightbox } from "@/features/screenshots/components/ScreenshotLightbox";

const CAPTURE_POLL_MS = 2500;
const CAPTURE_POLL_ATTEMPTS = 14;
const MAX_ITEMS = 100;

const shotKey = (s: Screenshot) => s.id ?? s.takenAt;

function formatTaken(iso: string): string {
  try {
    return format(parseISO(iso), "MMM d, h:mm a");
  } catch {
    return iso;
  }
}

function takenMs(shot: Screenshot): number {
  return new Date(shot.takenAt).getTime();
}

function KindBadge({ kind }: { kind: ScreenshotKind }) {
  const manual = kind === "MANUAL";
  return (
    <span
      className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
        manual
          ? "bg-[rgb(34_34_204)] text-white"
          : "bg-white/85 text-slate-600 ring-1 ring-slate-200"
      }`}
    >
      {manual ? "Manual" : "Auto"}
    </span>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              active
                ? "bg-white text-[rgb(34_34_204)] shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function UserScreenshots({ userId }: { userId: string }) {
  const [items, setItems] = useState<Screenshot[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [preview, setPreview] = useState<Screenshot | null>(null);

  const [kind, setKind] = useState<KindFilter>("ALL");
  const [range, setRange] = useState<RangeFilter>("ALL");
  const [dateVal, setDateVal] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");

  const mountedRef = useRef(true);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      try {
        const res = await getScreenshots({
          userId,
          limit: MAX_ITEMS,
          q: query || undefined,
        });
        if (!mountedRef.current) return;
        setItems(res.items);
        setTotal(res.total);
        setError(null);
      } catch (err) {
        if (!mountedRef.current) return;
        setError(err instanceof Error ? err.message : "Couldn't load screenshots.");
      } finally {
        if (mountedRef.current && !opts?.silent) setLoading(false);
      }
    },
    [userId, query],
  );

  useEffect(() => {
    mountedRef.current = true;
    void load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  useEffect(() => {
    if (!preview) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPreview(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [preview]);

  const filtered = useMemo(() => {
    const now = Date.now();
    return items.filter((shot) => {
      if (kind !== "ALL" && shot.kind !== kind) return false;

      if (range === "ALL") return true;
      const t = takenMs(shot);
      if (Number.isNaN(t)) return false;

      if (range === "LAST_HOUR") return now - t <= 60 * 60 * 1000;
      if (range === "TODAY") {
        const d = new Date(t);
        const today = new Date();
        return (
          d.getFullYear() === today.getFullYear() &&
          d.getMonth() === today.getMonth() &&
          d.getDate() === today.getDate()
        );
      }
      if (range === "DATE") {
        if (!dateVal) return true;
        return format(new Date(t), "yyyy-MM-dd") === dateVal;
      }
      return true;
    });
  }, [items, kind, range, dateVal]);

  async function handleCapture() {
    setCapturing(true);
    const beforeTotal = total;
    const beforeTop = items[0] ? shotKey(items[0]) : null;
    try {
      await captureScreenshot(userId);
      toast.success("Capture requested — waiting for the agent…");

      let found = false;
      for (let i = 0; i < CAPTURE_POLL_ATTEMPTS && mountedRef.current; i++) {
        await new Promise((r) => setTimeout(r, CAPTURE_POLL_MS));
        const res = await getScreenshots({
          userId,
          limit: MAX_ITEMS,
          q: query || undefined,
        });
        if (!mountedRef.current) return;
        setItems(res.items);
        setTotal(res.total);
        setError(null);
        const top = res.items[0] ? shotKey(res.items[0]) : null;
        if (res.total > beforeTotal || (top && top !== beforeTop)) {
          found = true;
          break;
        }
      }

      if (found) toast.success("New screenshot captured.");
      else toast.info("Still waiting — the user's agent may be offline. Try Refresh shortly.");
    } catch {
      toast.error("Couldn't request a capture. Is the user's agent online?");
    } finally {
      if (mountedRef.current) setCapturing(false);
    }
  }

  const activeFilterCount = filtered.length;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Screenshot Repository
          </h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
            {activeFilterCount}
            {activeFilterCount !== total ? ` / ${total}` : ""}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => load()}
            disabled={loading || capturing}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleCapture}
            disabled={capturing}
            className="flex items-center gap-2 rounded-xl bg-[rgb(34_34_204)] px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[rgb(28_28_180)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Camera className={`h-4 w-4 ${capturing ? "animate-pulse" : ""}`} />
            {capturing ? "Capturing…" : "Capture now"}
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-3">
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Kind</p>
          <Segmented<KindFilter>
            value={kind}
            onChange={setKind}
            options={[
              { value: "ALL", label: "All" },
              { value: "AUTO", label: "Auto" },
              { value: "MANUAL", label: "Manual" },
            ]}
          />
        </div>

        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Time range
          </p>
          <div className="flex items-center gap-2">
            <Segmented<RangeFilter>
              value={range}
              onChange={setRange}
              options={[
                { value: "ALL", label: "All" },
                { value: "LAST_HOUR", label: "Last hour" },
                { value: "TODAY", label: "Today" },
                { value: "DATE", label: "Date" },
              ]}
            />
            {range === "DATE" && (
              <input
                type="date"
                value={dateVal}
                onChange={(e) => setDateVal(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 focus:border-[rgb(34_34_204)] focus:outline-none"
              />
            )}
          </div>
        </div>

        <div className="min-w-[220px] flex-1 space-y-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Search content (OCR)
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setQuery(search.trim());
            }}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 focus-within:border-[rgb(34_34_204)]"
          >
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search text inside screenshots…"
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            />
            {(search || query) && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearch("");
                  setQuery("");
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </form>
        </div>
      </div>

      <div className="mt-5">
        {loading ? (
          <Loader label="Loading screenshots…" className="px-6 py-12" />
        ) : error ? (
          <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-red-200 bg-red-50 text-sm text-red-600">
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center text-sm text-slate-400">
            <Camera className="h-6 w-6" />
            <p>
              {items.length === 0
                ? "No screenshots captured yet."
                : "No screenshots match these filters."}
            </p>
            {items.length === 0 && (
              <p className="text-xs">Use “Capture now” to request one from the user’s agent.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((shot, i) => (
              <button
                key={shot.id ?? `${shot.takenAt}-${i}`}
                type="button"
                onClick={() => setPreview(shot)}
                className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100 text-left transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[rgba(34,34,204,0.35)]"
              >
                <img
                  src={shot.url}
                  alt={`Screenshot from ${formatTaken(shot.takenAt)}`}
                  loading="lazy"
                  className="aspect-video w-full object-cover transition group-hover:scale-[1.02]"
                />
                <span className="absolute left-2 top-2">
                  <KindBadge kind={shot.kind} />
                </span>
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2.5 py-1.5 text-[11px] font-medium text-white">
                  {formatTaken(shot.takenAt)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {preview && (
        <ScreenshotLightbox
          src={preview.url}
          alt={`Screenshot from ${formatTaken(preview.takenAt)}`}
          label={formatTaken(preview.takenAt)}
          badge={<KindBadge kind={preview.kind} />}
          onClose={() => setPreview(null)}
        />
      )}
    </section>
  );
}
