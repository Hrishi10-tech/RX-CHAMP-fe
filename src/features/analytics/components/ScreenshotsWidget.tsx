"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { Camera, ChevronDown, ChevronUp, Loader2, Maximize2 } from "lucide-react";
import { toast } from "sonner";

import { getScreenshots } from "@/features/screenshots/api/getScreenshots";
import { captureScreenshot } from "@/features/screenshots/api/captureScreenshot";
import type { Screenshot } from "@/features/screenshots/types";
import { ScreenshotLightbox } from "@/features/screenshots/components/ScreenshotLightbox";
import { TimePicker } from "@/components/ui/TimePicker";

const pad = (n: number) => String(n).padStart(2, "0");
const shotKey = (s: Screenshot, i: number) => s.id ?? `${s.takenAt}-${i}`;

function timeLabel(iso: string): string {
  try {
    return format(parseISO(iso), "hh:mm a");
  } catch {
    return iso;
  }
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const PAGE_SIZE = 10;
// Default to the whole day so every screenshot the agent took shows — from login
// through any overtime — instead of a fixed 9–6 window that hid captures outside it.
// The user can still narrow the range to inspect a specific time.
const FULL_DAY = { start: "00:00", end: "23:59" };

function rangeIso(
  date: string | undefined,
  startMin: number,
  endMin: number,
): { from: string; to: string } {
  const base = date ? new Date(`${date}T00:00:00`) : new Date();
  base.setHours(0, 0, 0, 0);
  const from = new Date(base.getTime() + startMin * 60000);
  const to = new Date(base.getTime() + (endMin + 1) * 60000);
  return { from: from.toISOString(), to: to.toISOString() };
}

function dedupById(list: Screenshot[]): Screenshot[] {
  const seen = new Set<string>();
  const out: Screenshot[] = [];
  for (const s of list) {
    const k = s.id ?? s.takenAt;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

function stepTime(hhmm: string, deltaHours: number): string {
  const mins = Math.max(0, Math.min(23 * 60 + 59, toMinutes(hhmm) + deltaHours * 60));
  return `${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
}

function TimeField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1">
      <div className="w-[120px]">
        <TimePicker value={value} onChange={onChange} iconClassName="text-[rgb(34_34_204)]" />
      </div>
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          onClick={() => onChange(stepTime(value, 1))}
          aria-label="Increase time by an hour"
          className="flex h-[18px] w-6 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-[rgb(34_34_204)]"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onChange(stepTime(value, -1))}
          aria-label="Decrease time by an hour"
          className="flex h-[18px] w-6 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-[rgb(34_34_204)]"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function minuteLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const ampm = h < 12 ? "AM" : "PM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${pad(hr)}:${pad(m)} ${ampm}`;
}

function agoLabel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.round(diff / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs} hr${hrs === 1 ? "" : "s"} ago`;
}

export function ScreenshotsWidget({ userId, date }: { userId: string; date?: string }) {
  const [items, setItems] = useState<Screenshot[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [preview, setPreview] = useState<Screenshot | null>(null);
  const [range, setRange] = useState(FULL_DAY);

  const mounted = useRef(true);
  const fetchingRef = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const startMin = toMinutes(range.start);
  const endMin = Math.max(startMin, toMinutes(range.end));

  const loadPage = useCallback(
    async (offset: number, replace: boolean) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      if (replace) setLoading(true);
      else setLoadingMore(true);
      try {
        const { from, to } = rangeIso(date, startMin, endMin);
        const res = await getScreenshots({
          userId,
          from,
          to,
          limit: PAGE_SIZE,
          offset,
        });
        if (!mounted.current) return;
        setItems((prev) => {
          const next = replace ? res.items : dedupById([...prev, ...res.items]);
          setTotal(!replace && res.items.length === 0 ? next.length : res.total);
          return next;
        });
      } catch {
        if (mounted.current && replace) {
          setItems([]);
          setTotal(0);
        }
      } finally {
        if (mounted.current) {
          setLoading(false);
          setLoadingMore(false);
        }
        fetchingRef.current = false;
      }
    },
    [userId, date, startMin, endMin],
  );

  useEffect(() => {
    setItems([]);
    void loadPage(0, true);
  }, [loadPage]);

  const hasMore = items.length < total;

  function loadMore() {
    if (loading || loadingMore || fetchingRef.current || !hasMore) return;
    void loadPage(items.length, false);
  }

  const filtered = items;

  async function handleCapture() {
    setCapturing(true);
    try {
      await captureScreenshot(userId);
      toast.success("Capture requested — waiting for the agent…");
      for (const delay of [3000, 6000]) {
        await new Promise((r) => setTimeout(r, delay));
        if (!mounted.current) return;
        await loadPage(0, true);
      }
    } catch {
      toast.error("Couldn't request a capture. Is the agent online?");
    } finally {
      if (mounted.current) setCapturing(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wide text-slate-600">
            Screenshots Timeline
          </h2>
          <p className="mt-1 text-sm font-medium text-slate-600">
            {loading
              ? "Loading…"
              : `Total ${total} screenshot${
                  total === 1 ? "" : "s"
                } captured between ${minuteLabel(startMin)} – ${minuteLabel(endMin)}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <TimeField value={range.start} onChange={(v) => setRange({ start: v, end: range.end })} />
          <span className="text-sm text-slate-400">to</span>
          <TimeField value={range.end} onChange={(v) => setRange({ start: range.start, end: v })} />
          <button
            type="button"
            onClick={handleCapture}
            disabled={capturing}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[rgb(34_34_204)] px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[rgb(28_28_180)] disabled:opacity-60"
          >
            <Camera className={`h-4 w-4 ${capturing ? "animate-pulse" : ""}`} />
            {capturing ? "Capturing…" : "Capture "}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-video animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-6 flex h-40 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center text-sm text-slate-400">
          <Camera className="h-6 w-6" />
          <p>No screenshots in this range.</p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((shot, i) => (
              <div key={shotKey(shot, i)}>
                <p className="mb-1.5 text-xs font-semibold text-slate-500">
                  {timeLabel(shot.takenAt)}
                </p>
                <button
                  type="button"
                  onClick={() => setPreview(shot)}
                  className="group block w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-900"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={shot.url}
                    alt={`Screenshot at ${timeLabel(shot.takenAt)}`}
                    loading="lazy"
                    className="aspect-video w-full object-cover transition group-hover:opacity-90"
                  />
                </button>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">{agoLabel(shot.takenAt)}</span>
                  <button
                    type="button"
                    onClick={() => setPreview(shot)}
                    aria-label="Open full screen"
                    className="text-slate-400 transition-colors hover:text-[rgb(34_34_204)]"
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-center gap-4">
            {hasMore && (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-70"
              >
                {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                {loadingMore ? "Loading…" : `Load more (${items.length} of ${total})`}
              </button>
            )}
            {(range.start !== FULL_DAY.start || range.end !== FULL_DAY.end) && (
              <button
                type="button"
                onClick={() => setRange(FULL_DAY)}
                className="text-sm font-semibold text-[rgb(34_34_204)] hover:underline"
              >
                View Full Timeline →
              </button>
            )}
          </div>
        </>
      )}

      {preview && (
        <ScreenshotLightbox
          src={preview.url}
          alt={`Screenshot at ${timeLabel(preview.takenAt)}`}
          label={timeLabel(preview.takenAt)}
          onClose={() => setPreview(null)}
        />
      )}
    </section>
  );
}
