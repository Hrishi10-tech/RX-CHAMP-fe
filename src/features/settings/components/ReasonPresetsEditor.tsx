"use client";

import { useState, type KeyboardEvent } from "react";
import { Loader2, Plus, RotateCcw, Save, X } from "lucide-react";
import { toast } from "sonner";

import { ErrorState, LoadingState } from "@/components/ui/StatePanel";
import { btnGhost, btnPrimary, btnSecondary, cardBase, inputBase } from "@/components/ui/classes";
import { errorMessage } from "@/lib/api";
import { useReasonPresets, useSaveReasonPresets } from "@/features/settings/hooks/usePresets";
import type { PresetKind, ReasonPresetsView } from "@/features/settings/api/presets";

function same(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

/** One kind of comment: its quick answers as removable chips, and a box to add one. */
function KindCard({
  kind,
  label,
  asked,
  value,
  saved,
  limits,
  disabled,
  onChange,
  onReset,
}: {
  kind: PresetKind;
  label: string;
  asked: string;
  value: string[];
  saved: string[];
  limits: ReasonPresetsView["limits"];
  disabled: boolean;
  onChange: (next: string[]) => void;
  onReset: () => void;
}) {
  const [text, setText] = useState("");
  const id = `preset-${kind}`;
  const full = value.length >= limits.perKind;

  function add() {
    const t = text.trim().replace(/\s+/g, " ");
    if (!t) return;
    if (t.length > limits.textMax) {
      toast.error(`Keep a quick answer under ${limits.textMax} characters.`);
      return;
    }
    if (value.some((v) => v.toLowerCase() === t.toLowerCase())) {
      setText("");
      return;
    }
    onChange([...value, t]);
    setText("");
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      add();
    }
  }

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="border-t border-slate-100 py-4 first:border-t-0"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 id={`${id}-title`} className="text-sm font-semibold text-slate-800">
            {label}
          </h3>
          <p className="mt-0.5 text-sm text-slate-500">{asked}</p>
        </div>
        {!same(value, saved) && (
          <span className="text-xs font-semibold text-amber-700">Unsaved</span>
        )}
      </div>
      <ul className="mt-2 flex flex-wrap gap-2" aria-label={`Quick answers: ${label}`}>
        {value.length === 0 && (
          <li className="text-sm italic text-slate-500">
            No quick answers: people type their own.
          </li>
        )}
        {value.map((v) => (
          <li
            key={v}
            className="inline-flex max-w-full items-center gap-1 rounded-full border border-slate-200 bg-slate-50 py-1 pl-3 pr-1 text-sm text-slate-800"
          >
            <span className="break-words">{v}</span>
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x !== v))}
              disabled={disabled}
              aria-label={`Remove ${v}`}
              className="rounded-full p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(34,34,204,0.35)]"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label htmlFor={id} className="sr-only">
          Add a quick answer for {label}
        </label>
        <input
          id={id}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          maxLength={limits.textMax}
          disabled={disabled || full}
          placeholder={full ? `At most ${limits.perKind}` : "Add a quick answer"}
          className={`${inputBase} !mt-0 sm:max-w-sm`}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={add}
            disabled={disabled || full || !text.trim()}
            className={btnSecondary}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add
          </button>
          <button type="button" onClick={onReset} disabled={disabled} className={btnGhost}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            Defaults
          </button>
        </div>
      </div>
    </section>
  );
}

/**
 * Quick answers (3.2, fix 12): for every kind of comment the agent and the portal
 * ask for, the presets offered next to the box. Picking one fills the box; people
 * can always type their own words.
 */
export function ReasonPresetsEditor() {
  const query = useReasonPresets();
  const save = useSaveReasonPresets();
  const [draft, setDraft] = useState<Partial<Record<PresetKind, string[] | null>>>({});

  if (query.isLoading)
    return (
      <div className={cardBase}>
        <LoadingState label="Loading quick answers…" />
      </div>
    );
  if (query.isError || !query.data) {
    return (
      <div className={cardBase}>
        <ErrorState
          title="Couldn't load the quick answers"
          message={errorMessage(query.error)}
          onRetry={() => query.refetch()}
          retrying={query.isFetching}
        />
      </div>
    );
  }
  const view = query.data;
  const valueOf = (k: PresetKind) => {
    const d = draft[k];
    return d === undefined ? view.presets[k] : d === null ? view.presets[k] : d;
  };
  const changed = Object.keys(draft).length > 0;

  async function submit() {
    try {
      await save.mutateAsync(draft);
      setDraft({});
      toast.success("Quick answers saved", {
        description: "The portal shows them now; the desktop app from its next update.",
      });
    } catch (err) {
      toast.error("Couldn't save the quick answers", {
        description: errorMessage(err) ?? "Please try again.",
      });
    }
  }

  return (
    <div className="space-y-4">
      <section className={`${cardBase} px-4 py-4 sm:px-6`}>
        <h2 className="text-base font-bold text-slate-900">Quick answers</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Shown as one-tap answers next to each comment box. Up to {view.limits.perKind} per box,{" "}
          {view.limits.textMax} characters each.
        </p>
        <div className="mt-2">
          {view.kinds.map((k) => (
            <KindCard
              key={k.kind}
              kind={k.kind}
              label={k.label}
              asked={k.asked}
              value={valueOf(k.kind)}
              saved={view.presets[k.kind]}
              limits={view.limits}
              disabled={save.isPending}
              onChange={(next) => setDraft((d) => ({ ...d, [k.kind]: next }))}
              onReset={() => setDraft((d) => ({ ...d, [k.kind]: null }))}
            />
          ))}
        </div>
      </section>
      <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-2 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:flex-row sm:items-center sm:justify-between sm:rounded-2xl sm:border sm:shadow-sm">
        <p className="text-sm" aria-live="polite">
          {changed ? (
            <span className="font-semibold text-amber-700">Unsaved changes</span>
          ) : (
            <span className="text-slate-600">Saved</span>
          )}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button
            type="button"
            onClick={() => setDraft({})}
            disabled={!changed || save.isPending}
            className={btnSecondary}
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Undo changes
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!changed || save.isPending}
            className={btnPrimary}
          >
            {save.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Save className="h-4 w-4" aria-hidden />
            )}
            Save quick answers
          </button>
        </div>
      </div>
    </div>
  );
}
