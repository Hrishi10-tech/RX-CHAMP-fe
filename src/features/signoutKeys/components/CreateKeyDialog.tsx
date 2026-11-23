"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Building2,
  Check,
  Copy,
  KeyRound,
  Loader2,
  Network,
  Search,
  Users,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { PersonAvatar } from "@/components/avatar/PersonAvatar";
import { Modal } from "@/components/ui/Modal";
import { FieldError } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { errorMessage } from "@/lib/api";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { useOrgScope } from "@/lib/org/selection";
import { formatDayWithWeekday, dateKeyOf } from "@/lib/time/businessTime";
import { formatTime12 } from "@/lib/time/format";
import { DepartmentPicker } from "@/features/departments/components/DepartmentPicker";
import { useDepartments } from "@/features/departments/hooks/useDepartments";
import { getUsers } from "@/features/users/api/getUsers";
import {
  createSignOutKey,
  type CreatedSignOutKey,
  type SignOutScope,
} from "@/features/signoutKeys/api/signoutKeys";

const SCOPES: { value: SignOutScope; label: string; detail: string; icon: LucideIcon }[] = [
  { value: "USERS", label: "People", detail: "One or more people", icon: Users },
  { value: "DEPARTMENTS", label: "Departments", detail: "Everyone in them", icon: Network },
  { value: "ORG", label: "Organisation", detail: "Everyone", icon: Building2 },
];

/** "Tue 20 Oct, 3:05 PM". */
export function whenText(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${formatDayWithWeekday(dateKeyOf(d))}, ${formatTime12(d)}`;
}

function PeoplePicker({ value, onChange }: { value: string[]; onChange: (ids: string[]) => void }) {
  const org = useOrgScope();
  const [query, setQuery] = useState("");
  const q = useDebouncedValue(query.trim(), 250);
  const people = useQuery({
    queryKey: ["users", org, "picker", q],
    queryFn: () => getUsers({ q: q || undefined, limit: 50, status: "ACTIVE" }),
  });
  const rows = people.data?.users ?? [];

  return (
    <div className="overflow-hidden rounded-xl border border-card">
      <div className="relative border-b border-divider">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find people"
          aria-label="Find people"
          className="h-10 w-full bg-transparent pl-9 pr-3 text-sm outline-none"
        />
      </div>
      <div role="group" aria-label="People" className="max-h-56 overflow-y-auto p-1.5">
        {people.isPending && <p className="px-3 py-3 text-sm text-quiet">Loading…</p>}
        {rows.map((u) => {
          const name =
            u.name || `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email || u.id;
          const checked = value.includes(u.id);
          return (
            <button
              key={u.id}
              type="button"
              role="checkbox"
              aria-checked={checked}
              onClick={() => onChange(checked ? value.filter((v) => v !== u.id) : [...value, u.id])}
              className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition ${
                checked ? "bg-brand/6" : "hover:bg-fill"
              }`}
            >
              <PersonAvatar name={name} avatarId={u.avatarId} userId={u.id} size={28} />
              <span className="min-w-0 flex-1 truncate font-semibold text-strong">{name}</span>
              <span
                aria-hidden
                className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                  checked ? "border-brand bg-brand text-on-brand" : "border-edge-strong"
                }`}
              >
                {checked && <Check className="h-3.5 w-3.5" />}
              </span>
            </button>
          );
        })}
        {people.isSuccess && rows.length === 0 && (
          <p className="px-3 py-3 text-sm text-quiet">Nobody matches.</p>
        )}
      </div>
    </div>
  );
}

/** The phrase, shown once, with Copy and its expiry (SPEC 2.8). */
function PhraseReveal({ created }: { created: CreatedSignOutKey }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(created.phrase);
      setCopied(true);
      toast.success("Key copied");
    } catch {
      toast.error("Couldn't copy", { description: "Select the words and copy them by hand." });
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-brand/25 bg-brand/4 p-4 text-center">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-quiet">
          Sign-out key
        </p>
        <p
          data-testid="signout-phrase"
          className="mt-2 select-all break-words font-mono text-xl font-bold tracking-wide text-primary"
        >
          {created.phrase}
        </p>
        <Button type="button" onClick={copy} className="mt-3">
          {copied ? (
            <Check className="h-4 w-4 text-working" aria-hidden />
          ) : (
            <Copy className="h-4 w-4" aria-hidden />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <p className="text-sm text-soft">
        Valid until{" "}
        <span className="font-semibold text-primary">
          {whenText(created.expiresAt) || "24 hours from now"}
        </span>
        . Give it to the person who needs to sign out; they type it into the RX Vision app.
      </p>
      <p className="flex items-start gap-2 rounded-lg border border-attention-edge bg-attention-wash px-3 py-2 text-sm text-attention-ink">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-attention" aria-hidden />
        This is the only time the key is shown. Only a fingerprint of it is stored.
      </p>
    </div>
  );
}

/** Create a 24-hour sign-out key for people, departments or the whole organisation. */
export function CreateKeyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const departments = useDepartments(open);
  const [scope, setScope] = useState<SignOutScope>("USERS");
  const [userIds, setUserIds] = useState<string[]>([]);
  const [departmentIds, setDepartmentIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<CreatedSignOutKey | null>(null);

  // Every opening starts clean: the phrase of the last key is never shown again.
  useEffect(() => {
    if (open) return;
    setScope("USERS");
    setUserIds([]);
    setDepartmentIds([]);
    setError(null);
    setCreated(null);
  }, [open]);

  const ready = useMemo(
    () =>
      scope === "ORG" ||
      (scope === "USERS" && userIds.length > 0) ||
      (scope === "DEPARTMENTS" && departmentIds.length > 0),
    [scope, userIds, departmentIds],
  );

  async function create() {
    if (!ready) {
      setError(scope === "USERS" ? "Pick at least one person." : "Pick at least one department.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const key = await createSignOutKey({ scope, userIds, departmentIds });
      setCreated(key);
      void queryClient.invalidateQueries({ queryKey: ["signout-keys"] });
    } catch (err) {
      setError(errorMessage(err) ?? "Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      title={created ? "Key created" : "Create a sign-out key"}
      description={
        created
          ? undefined
          : "Only a valid key lets the RX Vision app sign out. Each key works for 24 hours, inside its scope."
      }
      className="max-w-lg"
    >
      <div className="space-y-5 px-6 py-5">
        {created ? (
          <PhraseReveal created={created} />
        ) : (
          <>
            <div role="radiogroup" aria-label="Who can use it" className="grid grid-cols-3 gap-2">
              {SCOPES.map(({ value, label, detail, icon: Icon }) => {
                const selected = scope === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      setScope(value);
                      setError(null);
                    }}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition ${
                      selected
                        ? "border-brand bg-brand/5 ring-1 ring-brand"
                        : "border-card hover:bg-fill"
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 ${selected ? "text-brand" : "text-quiet"}`}
                      aria-hidden
                    />
                    <span className="text-sm font-semibold text-strong">{label}</span>
                    <span className="text-[0.6875rem] text-quiet">{detail}</span>
                  </button>
                );
              })}
            </div>

            {scope === "USERS" && <PeoplePicker value={userIds} onChange={setUserIds} />}
            {scope === "DEPARTMENTS" && (
              <DepartmentPicker
                departments={departments.data ?? []}
                value={departmentIds}
                onChange={setDepartmentIds}
                multiple
                label="Departments"
              />
            )}
            {scope === "ORG" && (
              <p className="flex items-start gap-2 rounded-lg border border-attention-edge bg-attention-wash px-3 py-2 text-sm text-attention-ink">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-attention" aria-hidden />
                Anyone in the organisation who has the key can sign out of the app for 24 hours.
              </p>
            )}
            {error && <FieldError>{error}</FieldError>}
          </>
        )}
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-divider px-6 py-4 sm:flex-row sm:justify-end">
        {created ? (
          <Button type="button" variant="primary" onClick={onClose}>
            Done
          </Button>
        ) : (
          <>
            <Button type="button" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" variant="primary" onClick={create} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <KeyRound className="h-4 w-4" aria-hidden />
              )}
              Create key
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}
