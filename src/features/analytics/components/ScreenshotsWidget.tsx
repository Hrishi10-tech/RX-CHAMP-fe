"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Loader2,
  Maximize2,
} from "lucide-react";
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
const DEFAULT_RANGE = { start: "09:00", end: "18:00" };
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

function hourLabel(h: number): string {
  const ampm = h < 12 || h === 24 ? "AM" : "PM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${pad(hr)}:00 ${ampm}`;
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
  const [range, setRange] = useState(DEFAULT_RANGE);
  const [dragging, setDragging] = useState(false);
  const [activeHour, setActiveHour] = useState<number | null>(null);

  const mounted = useRef(true);
  const stripRef = useRef<HTMLDivElement>(null);
  const axisRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; scroll: number } | null>(null);
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
    setActiveHour(null);
    stripRef.current?.scrollTo({ left: 0 });
    void loadPage(0, true);
  }, [loadPage]);

  const hasMore = items.length < total;

  function loadMore() {
    if (loading || loadingMore || fetchingRef.current || !hasMore) return;
    void loadPage(items.length, false);
  }

  const filtered = items;

  const hours = useMemo(() => {
    const startH = Math.floor(startMin / 60);
    const endH = Math.ceil(endMin / 60);
    const list: { hour: number; count: number }[] = [];
    for (let h = startH; h <= endH; h++) {
      const count = filtered.filter((s) => new Date(s.takenAt).getHours() === h).length;
      list.push({ hour: h, count });
    }
    return list;
  }, [startMin, endMin, filtered]);

  useEffect(() => {
    setActiveHour(filtered.length ? new Date(filtered[0].takenAt).getHours() : null);
  }, [filtered]);

  const activeIndex = useMemo(() => {
    if (activeHour == null) return -1;
    return hours.findIndex((h) => h.hour === activeHour);
  }, [hours, activeHour]);
  const fillPct =
    activeIndex > 0 && hours.length > 1 ? (activeIndex / (hours.length - 1)) * 100 : 0;

  function onStripScroll() {
    const el = stripRef.current;
    if (!el || !filtered.length) return;
    const step = 176 + 12;
    const idx = Math.min(filtered.length - 1, Math.max(0, Math.round(el.scrollLeft / step)));
    const hour = new Date(filtered[idx].takenAt).getHours();
    setActiveHour((prev) => (prev === hour ? prev : hour));

    if (el.scrollWidth - el.scrollLeft - el.clientWidth < 260) loadMore();
  }

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

  function scrollStrip(dir: -1 | 1) {
    stripRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  }
  function scrollAxis(dir: -1 | 1) {
    axisRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  }

  function onDown(e: React.PointerEvent) {
    if (!stripRef.current) return;
    dragRef.current = { x: e.clientX, scroll: stripRef.current.scrollLeft };
    setDragging(true);
  }
  function onMove(e: React.PointerEvent) {
    if (!dragRef.current || !stripRef.current) return;
    stripRef.current.scrollLeft = dragRef.current.scroll - (e.clientX - dragRef.current.x);
  }
  function endDrag() {
    dragRef.current = null;
    setDragging(false);
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

      {!loading && hours.length > 0 && (
        <div className="mt-6 flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollAxis(-1)}
            aria-label="Scroll timeline left"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div ref={axisRef} className="scrollbar-slim flex-1 overflow-x-auto">
            <div style={{ minWidth: `${hours.length * 92}px` }}>
              <div className="flex">
                {hours.map((h, i) => {
                  const active = i === activeIndex;
                  return (
                    <div key={h.hour} className="flex flex-1 flex-col items-center gap-2">
                      <span className="whitespace-nowrap text-xs font-medium text-slate-500">
                        {hourLabel(h.hour)}
                      </span>
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                          active
                            ? "bg-[rgb(34_34_204)] text-white shadow-sm shadow-[rgba(34,34,204,0.35)]"
                            : "bg-[rgba(34,34,204,0.1)] text-[rgb(34_34_204)]"
                        }`}
                      >
                        {h.count}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="relative mt-3 h-3">
                <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 bg-slate-200" />
                <div
                  className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-[rgb(34_34_204)]"
                  style={{ width: `${fillPct}%` }}
                />
                <div className="relative flex justify-between">
                  {hours.map((h, i) => (
                    <span
                      key={h.hour}
                      className={`h-3 w-3 rounded-full ring-2 ring-white ${
                        i <= activeIndex && activeIndex >= 0
                          ? "bg-[rgb(34_34_204)]"
                          : "bg-slate-300"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => scrollAxis(1)}
            aria-label="Scroll timeline right"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="mt-6 flex gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 w-44 shrink-0 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-6 flex h-40 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center text-sm text-slate-400">
          <Camera className="h-6 w-6" />
          <p>No screenshots in this range.</p>
        </div>
      ) : (
        <div className="relative mt-6">
          <button
            type="button"
            onClick={() => scrollStrip(-1)}
            aria-label="Previous screenshots"
            className="absolute -left-3 top-[38%] z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div
            ref={stripRef}
            onScroll={onStripScroll}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={endDrag}
            onPointerLeave={endDrag}
            className={`scrollbar-slim flex gap-3 overflow-x-auto pb-2 ${
              dragging ? "cursor-grabbing select-none" : "cursor-grab"
            }`}
          >
            {filtered.map((shot, i) => (
              <div key={shotKey(shot, i)} className="w-44 shrink-0">
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
                    draggable={false}
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

            {hasMore && (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="flex aspect-video w-44 shrink-0 flex-col items-center justify-center gap-1.5 self-start rounded-xl border border-dashed border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-70"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading…
                  </>
                ) : (
                  <>
                    <ChevronRight className="h-5 w-5" />
                    Load more
                    <span className="text-[10px] font-medium text-slate-400">
                      {items.length} of {total}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => scrollStrip(1)}
            aria-label="Next screenshots"
            className="absolute -right-3 top-[38%] z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm hover:bg-slate-50"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {!loading && (
        <div className="relative mt-4 flex items-center justify-center">
          <span className="flex items-center gap-2 text-xs text-slate-400">
            <ChevronLeft className="h-3.5 w-3.5" />
            Drag to scroll
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
          {(range.start !== FULL_DAY.start || range.end !== FULL_DAY.end) && (
            <button
              type="button"
              onClick={() => setRange(FULL_DAY)}
              className="absolute right-0 text-sm font-semibold text-[rgb(34_34_204)] hover:underline"
            >
              View Full Timeline →
            </button>
          )}
        </div>
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
