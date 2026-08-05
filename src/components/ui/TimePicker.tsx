"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Clock } from "lucide-react";

import type { Parsed, TimePickerProps } from "./types";

const BRAND = "#2222cc";
const FACE = 188;
const CENTER = FACE / 2;
const RADIUS = 72;
const NUM = 32;
const TICK_R = CENTER - 8;

export function formatTime12(value: string): string {
  if (!value) return "";
  const [h, m] = value.split(":").map(Number);
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function parseValue(value: string): Parsed {
  if (!value) return { h12: 9, m: 0, p: "AM" };
  const [h, m] = value.split(":").map(Number);
  return {
    h12: h % 12 === 0 ? 12 : h % 12,
    m,
    p: h < 12 ? "AM" : "PM",
  };
}

function pointAt(angleDeg: number, radius: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.sin(rad),
    y: CENTER - radius * Math.cos(rad),
  };
}

export function TimePicker({
  value,
  onChange,
  id,
  placeholder = "Select time",
  iconClassName = "text-[rgb(34_34_204)]",
  hasError = false,
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"hours" | "minutes">("hours");

  const sel = parseValue(value);

  function commit(next: Partial<Parsed>) {
    const h12 = next.h12 ?? sel.h12;
    const m = next.m ?? sel.m;
    const p = next.p ?? sel.p;
    const h24 = p === "AM" ? h12 % 12 : (h12 % 12) + 12;
    onChange(`${String(h24).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }

  useEffect(() => {
    if (open) setMode("hours");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const handAngle = mode === "hours" ? (sel.h12 % 12) * 30 : sel.m * 6;
  const knob = pointAt(handAngle, RADIUS);

  const numbers =
    mode === "hours"
      ? Array.from({ length: 12 }, (_, i) => i + 1)
      : Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <div className="relative">
      <button
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`flex w-full items-center gap-2.5 rounded-lg border bg-white py-2.5 pl-3.5 pr-3 text-left text-sm font-semibold tabular-nums transition-colors focus:outline-none focus:ring-2 ${
          hasError
            ? "border-red-400 focus:ring-[rgba(239,68,68,0.15)]"
            : open
              ? "border-[rgb(34_34_204)] focus:ring-[rgba(34,34,204,0.15)]"
              : "border-slate-200 hover:border-slate-300 focus:ring-[rgba(34,34,204,0.15)]"
        }`}
      >
        <Clock className={`h-4 w-4 shrink-0 ${iconClassName}`} />
        <span className={value ? "text-slate-900" : "text-slate-400"}>
          {value ? formatTime12(value) : placeholder}
        </span>
        <ChevronDown
          className={`ml-auto h-4 w-4 shrink-0 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Select time"
              onClick={(e) => e.stopPropagation()}
              className="w-[264px] overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_18px_50px_-18px_rgba(20,23,60,0.45)]"
            >
              <div className="bg-gradient-to-b from-[rgba(34,34,204,0.05)] to-transparent px-[22px] pb-5 pt-5">
                <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                  {mode === "hours" ? "Select hour" : "Select minute"}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-0.5 text-[40px] font-extrabold tabular-nums leading-none tracking-tight">
                    <button
                      type="button"
                      onClick={() => setMode("hours")}
                      className={`rounded-[9px] px-1.5 py-0.5 transition-colors ${
                        mode === "hours"
                          ? "bg-[rgba(34,34,204,0.1)] text-[rgb(34_34_204)]"
                          : "text-slate-300 hover:text-slate-400"
                      }`}
                    >
                      {String(sel.h12).padStart(2, "0")}
                    </button>
                    <span className="text-slate-300">:</span>
                    <button
                      type="button"
                      onClick={() => setMode("minutes")}
                      className={`rounded-[9px] px-1.5 py-0.5 transition-colors ${
                        mode === "minutes"
                          ? "bg-[rgba(34,34,204,0.1)] text-[rgb(34_34_204)]"
                          : "text-slate-300 hover:text-slate-400"
                      }`}
                    >
                      {String(sel.m).padStart(2, "0")}
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {(["AM", "PM"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => commit({ p })}
                        className={`rounded-[9px] px-2.5 py-1.5 text-xs font-extrabold transition-colors ${
                          sel.p === p
                            ? "bg-[rgb(34_34_204)] text-white shadow-[0_4px_10px_-3px_rgba(34,34,204,0.55)]"
                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-center px-[22px]">
                <div
                  className="relative rounded-full border border-[#eceef6]"
                  style={{
                    width: FACE,
                    height: FACE,
                    background: "radial-gradient(circle at 50% 38%, #fff, #f4f5fb)",
                    boxShadow: "inset 0 2px 8px rgba(15,23,42,0.05)",
                  }}
                >
                  <div aria-hidden className="pointer-events-none absolute inset-0">
                    {Array.from({ length: 60 }).map((_, i) => {
                      const major = i % 5 === 0;
                      const { x, y } = pointAt(i * 6, TICK_R);
                      return (
                        <div
                          key={i}
                          className="absolute rounded-sm"
                          style={{
                            left: x,
                            top: y,
                            width: major ? 2 : 1,
                            height: major ? 9 : 5,
                            background: major ? "#c7cbe0" : "#e1e4ef",
                            transform: `translate(-50%, -50%) rotate(${i * 6}deg)`,
                          }}
                        />
                      );
                    })}
                  </div>
                  <div
                    aria-hidden
                    className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0"
                  >
                    <div
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full"
                      style={{
                        width: 2.5,
                        height: RADIUS,
                        background: BRAND,
                        transformOrigin: "bottom center",
                        transform: `rotate(${handAngle}deg)`,
                      }}
                    />
                  </div>

                  <div
                    aria-hidden
                    className="pointer-events-none absolute rounded-full"
                    style={{
                      width: NUM,
                      height: NUM,
                      left: knob.x - NUM / 2,
                      top: knob.y - NUM / 2,
                      background: BRAND,
                      boxShadow: "0 4px 12px -2px rgba(34,34,204,0.5)",
                    }}
                  />

                  <div
                    className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white"
                    style={{ background: BRAND }}
                  />

                  {numbers.map((n, i) => {
                    const { x, y } = pointAt(i * 30, RADIUS);
                    const selected = mode === "hours" ? n === sel.h12 : n === sel.m;
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => {
                          if (mode === "hours") {
                            commit({ h12: n });
                            setMode("minutes");
                          } else {
                            commit({ m: n });
                          }
                        }}
                        className="absolute z-10 flex items-center justify-center rounded-full text-[13px] tabular-nums transition-colors"
                        style={{
                          width: NUM,
                          height: NUM,
                          left: x - NUM / 2,
                          top: y - NUM / 2,
                          color: selected ? "#fff" : "#475069",
                          fontWeight: selected ? 800 : 600,
                        }}
                      >
                        {mode === "hours" ? n : String(n).padStart(2, "0")}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2.5 px-[22px] pb-5 pt-[18px]">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-[13px] border border-slate-200 py-2.5 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 rounded-[13px] bg-[rgb(34_34_204)] py-2.5 text-sm font-bold text-white transition-colors hover:bg-[rgb(28_28_180)]"
                >
                  Done
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
