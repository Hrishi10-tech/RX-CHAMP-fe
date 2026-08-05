"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus, X } from "lucide-react";

import type { ScreenshotLightboxProps } from "@/features/screenshots/types";

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;
const STEP = 0.5;

const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +z.toFixed(2)));

export function ScreenshotLightbox({ src, alt, label, badge, onClose }: ScreenshotLightboxProps) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{
    x: number;
    y: number;
    ox: number;
    oy: number;
  } | null>(null);

  const reset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };
  const zoomIn = () => setZoom((z) => clampZoom(z + STEP));
  const zoomOut = () =>
    setZoom((z) => {
      const next = clampZoom(z - STEP);
      if (next === 1) setOffset({ x: 0, y: 0 });
      return next;
    });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "+" || e.key === "=") zoomIn();
      else if (e.key === "-" || e.key === "_") zoomOut();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  function onWheel(e: React.WheelEvent) {
    setZoom((z) => {
      const next = clampZoom(z + (e.deltaY < 0 ? STEP : -STEP));
      if (next === 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  }

  function onPointerDown(e: React.PointerEvent<HTMLImageElement>) {
    if (zoom <= 1) return;
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLImageElement>) {
    if (!dragStart.current) return;
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.x),
      y: dragStart.current.oy + (e.clientY - dragStart.current.y),
    });
  }
  function endDrag() {
    dragStart.current = null;
    setDragging(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/90 p-4 backdrop-blur-sm"
      onClick={onClose}
      onWheel={onWheel}
    >
      <div
        className="absolute left-4 top-4 z-10 flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {badge}
        <span className="text-sm font-medium text-white/90">{label}</span>
      </div>

      <div
        className="absolute right-4 top-4 z-10 flex items-center gap-1.5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1 rounded-full bg-white/10 p-1 text-white">
          <button
            type="button"
            onClick={zoomOut}
            disabled={zoom <= MIN_ZOOM}
            aria-label="Zoom out"
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/20 disabled:opacity-40"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={reset}
            aria-label="Reset zoom"
            className="min-w-[52px] rounded-full px-2 py-1 text-xs font-semibold tabular-nums transition-colors hover:bg-white/20"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={zoomIn}
            disabled={zoom >= MAX_ZOOM}
            aria-label="Zoom in"
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/20 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
        className={`max-h-[92vh] w-auto max-w-[95vw] select-none rounded-lg object-contain shadow-2xl ${
          dragging ? "" : "transition-transform duration-150"
        } ${zoom > 1 ? (dragging ? "cursor-grabbing" : "cursor-grab") : ""}`}
      />
    </div>
  );
}
