"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Check, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { FloatingIcon } from "@/components/avatar/FloatingIcon";
import type { FloatingIconStatus } from "@/components/avatar/floatingIconGeometry";
import { SegmentedTabs, type SegmentedTab } from "@/components/ui/SegmentedTabs";
import { ErrorState, LoadingState } from "@/components/ui/StatePanel";
import { useSession } from "@/features/auth/hooks/useSession";
import { ProfileTrail } from "@/features/avatars/components/ProfileTrail";
import {
  useAvatarManifest,
  useAvatarUrl,
  useDayProgress,
  useMyAvatar,
  useResetMyAvatar,
  useSetMyAvatar,
} from "@/features/avatars/hooks/useAvatars";
import {
  DAY_NOT_LOADED,
  dayLabel,
  overTargetLabel,
  progressOf,
} from "@/features/avatars/lib/dayLabel";
import { avatarKeys } from "@/features/avatars/api/avatars";
import type { AvatarManifestItem, Gender } from "@/features/avatars/types";
import { updateUser } from "@/features/users/api/updateUser";
import { GenderField } from "@/features/users/components/GenderField";
import { errorMessage } from "@/lib/api";
import { initialsOf } from "@/lib/text/initials";
import { Button } from "@/components/ui/Button";
import { Page } from "@/components/layout/Page";

const PREVIEW_TABS: SegmentedTab<FloatingIconStatus>[] = [
  { value: "WORKING", label: "Working" },
  { value: "MEETING", label: "Meeting" },
  { value: "BREAK", label: "Break" },
  { value: "ENDED", label: "Ended" },
];

const CARD = "rounded-2xl border border-card bg-card p-5 text-primary shadow-sm sm:p-6";
const TEAL_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60";

function AvatarTile({
  avatar,
  selected,
  isDefault,
  onSelect,
}: {
  avatar: AvatarManifestItem;
  selected: boolean;
  isDefault: boolean;
  onSelect: () => void;
}) {
  return (
    <div className="relative flex justify-center">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        aria-label={`Avatar ${avatar.id}${isDefault ? ", your default" : ""}`}
        className={`relative rounded-full p-[3px] transition ${TEAL_RING} ${
          selected ? "ring-2 ring-brand" : "hover:ring-1 hover:ring-edge-strong"
        }`}
      >
        <Image
          unoptimized
          src={avatar.files["144"]}
          alt=""
          width={60}
          height={60}
          draggable={false}
          className="h-[52px] w-[52px] max-w-none rounded-full bg-fill object-cover sm:h-[60px] sm:w-[60px]"
        />
        {selected && (
          <span className="absolute bottom-0 right-0 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-brand text-on-brand ring-2 ring-card">
            <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
          </span>
        )}
      </button>
      {isDefault && (
        <span className="absolute -bottom-3.5 text-[0.6875rem] leading-none text-quiet">
          Default
        </span>
      )}
    </div>
  );
}

/**
 * 4.0: a Super Admin sets their own gender (nobody else may); here, since the people
 * lists never show a Super Admin. The API answers with the new default straight away.
 */
function OwnGender({ userId }: { userId: string }) {
  const client = useQueryClient();
  const [gender, setGender] = useState<Gender | null>(null);
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function save() {
    if (!gender) return;
    setSaving(true);
    setFailure(null);
    try {
      await updateUser(userId, { gender });
      await client.invalidateQueries({ queryKey: avatarKeys.mine() });
      toast.success("Gender saved", { description: "Your default avatar is set." });
    } catch (err) {
      setFailure(errorMessage(err) ?? "Your gender was not saved. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-2 space-y-3">
      <span id="own-gender-label" className="text-sm font-semibold text-primary">
        Gender
      </span>
      <GenderField
        labelledBy="own-gender-label"
        value={gender}
        onChange={setGender}
        disabled={saving}
      />
      {failure && (
        <p role="alert" className="text-sm text-attention-edge-strong">
          {failure}
        </p>
      )}
      <Button
        variant="primary"
        type="button"
        onClick={() => void save()}
        disabled={!gender || saving}
        className="px-5"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {saving ? "Saving…" : "Save gender"}
      </Button>
    </div>
  );
}

/** Who sets the gender of someone in this role (4.0, the API's canSetGender). */
function whoSetsGender(role: string | null): string {
  // Staff and Managers: their organisation's Admin (4.1: Staff use this page too).
  return role === "MANAGER" || role === "USER" ? "the organisation admin" : "a Super Admin";
}

/**
 * Settings, Profile, Avatar (design page 10): every role changes their avatar here
 * (4.1: Staff too, as on the agent and the phone). Dark cards as in the
 * approved design, so the preview reads as it will on a screen.
 */
export function AvatarSettings() {
  const { user, role } = useSession();
  const mine = useMyAvatar();
  const manifest = useAvatarManifest();
  const day = useDayProgress();
  const save = useSetMyAvatar();
  const reset = useResetMyAvatar();

  const [pending, setPending] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<FloatingIconStatus | null>(null);
  const [chosenSet, setChosenSet] = useState<number | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const library = mine.data?.library ?? null;
  const currentId = pending ?? mine.data?.avatarId ?? null;
  const own = useMemo(
    () => (manifest.data?.avatars ?? []).filter((a) => a.gender === library),
    [manifest.data, library],
  );
  const sets = useMemo(() => [...new Set(own.map((a) => a.set))].sort((a, b) => a - b), [own]);
  const activeSet = chosenSet ?? own.find((a) => a.id === currentId)?.set ?? sets[0];

  const largeUrl = useAvatarUrl(currentId, 160);
  const realSizeUrl = useAvatarUrl(currentId, 56);

  // Nothing known yet: a hollow dot and no words, never a status the person may not be in.
  const progress = day.data;
  const liveStatus = progress?.status;
  // A tab is a what-if for the status the person is in; when that changes, the preview follows.
  useEffect(() => {
    setPreviewTab(null);
  }, [liveStatus]);
  const status = previewTab ?? liveStatus ?? "NOT_STARTED";
  const ring = progress ? progressOf(progress.workedSec, progress.targetSec) : 0;
  const label = progress
    ? dayLabel(
        status,
        progress.workedSec,
        progress.targetSec,
        progress.date,
        status === liveStatus && progress.remote,
      )
    : day.isError && DAY_NOT_LOADED;
  const over = progress ? overTargetLabel(status, progress.overSec) : null;
  const name = user?.name ?? user?.email ?? "";

  const busy = save.isPending || reset.isPending;
  const dirty = pending !== null && pending !== mine.data?.avatarId;

  function choose(id: string) {
    setFailure(null);
    setPending(id);
  }

  function onSave() {
    if (!pending || !dirty) return;
    setFailure(null);
    const saved = pending;
    save.mutate(saved, {
      onSuccess: () => {
        // Another avatar picked while this one was saving stays picked.
        setPending((current) => (current === saved ? null : current));
        toast.success("Avatar updated", {
          description: "It shows on your other devices within seconds.",
        });
      },
      onError: (err) => setFailure(errorMessage(err) ?? "Your avatar was not saved. Try again."),
    });
  }

  function onReset() {
    setFailure(null);
    setChosenSet(null);
    setPending(null);
    if (!mine.data?.chosenAvatarId) return;
    reset.mutate(undefined, {
      onSuccess: () => toast.success("Back to your default avatar"),
      onError: (err) => setFailure(errorMessage(err) ?? "Your avatar was not reset. Try again."),
    });
  }

  let chooser;
  if (mine.isLoading || manifest.isLoading) {
    chooser = <LoadingState label="Loading avatars…" />;
  } else if ((mine.isError && !mine.data) || (manifest.isError && !manifest.data)) {
    // Only with nothing to show: a failed background refresh keeps the picker and the pick.
    chooser = (
      <ErrorState
        tone="dark"
        title="Your avatars did not load"
        message={errorMessage(mine.error ?? manifest.error)}
        onRetry={() => {
          void mine.refetch();
          void manifest.refetch();
        }}
      />
    );
  } else if (!library) {
    chooser = (
      <div className="flex flex-col items-start gap-2 text-sm text-quiet">
        <p className="text-base font-semibold text-primary">Choose an avatar</p>
        {role === "SUPER_ADMIN" && user ? (
          <>
            <p>Set your gender first. It decides which avatars you can choose from.</p>
            <OwnGender userId={user.id} />
          </>
        ) : (
          <p>You can choose an avatar once {whoSetsGender(role)} has set your gender.</p>
        )}
      </div>
    );
  } else {
    chooser = (
      <>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Choose an avatar</h2>
          <span className="text-xs text-quiet">
            {own.length} {library} avatars
          </span>
        </div>
        <div className="mt-4">
          <SegmentedTabs
            tone="dark"
            label="Avatar sets"
            value={String(activeSet)}
            onChange={(value) => setChosenSet(Number(value))}
            tabs={sets.map((set) => ({ value: String(set), label: `Set ${set}` }))}
          />
        </div>
        {/* By the room in this card, not the viewport: the sidebar and the preview take some. */}
        <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(58px,1fr))] gap-x-1.5 gap-y-5 sm:grid-cols-[repeat(auto-fill,minmax(66px,1fr))] sm:gap-x-2">
          {own
            .filter((avatar) => avatar.set === activeSet)
            .map((avatar) => (
              <AvatarTile
                key={avatar.id}
                avatar={avatar}
                selected={avatar.id === currentId}
                isDefault={avatar.id === mine.data?.defaultAvatarId}
                onSelect={() => choose(avatar.id)}
              />
            ))}
        </div>
        {failure && (
          <p role="alert" className="mt-4 text-sm text-attention-edge-strong">
            {failure}
          </p>
        )}
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            onClick={onReset}
            disabled={busy || (!pending && !mine.data?.chosenAvatarId)}
          >
            {reset.isPending ? "Resetting…" : "Reset to default"}
          </Button>
          <Button
            variant="primary"
            type="button"
            onClick={onSave}
            disabled={busy || !dirty}
            className="px-5"
          >
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {save.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </>
    );
  }

  const preview = (size: number, url: string | null) => (
    <FloatingIcon
      imageUrl={url}
      initials={initialsOf(name)}
      status={status}
      progress={ring}
      size={size}
    />
  );

  return (
    <Page width="form" className="space-y-5">
      <ProfileTrail title="Avatar" parent="Profile" />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)]">
        <section aria-label="Preview" className={CARD}>
          <h2 className="text-base font-semibold">Preview</h2>
          <div className="mt-4">
            <SegmentedTabs
              tone="dark"
              label="Preview a status"
              value={status}
              // The person's own status, or the tab already picked, goes back to following it.
              onChange={(tab) =>
                setPreviewTab(tab === liveStatus || tab === previewTab ? null : tab)
              }
              tabs={PREVIEW_TABS}
            />
          </div>
          <div className="mt-6 flex flex-col items-center text-center">
            {preview(160, largeUrl)}
            <p className="mt-4 min-h-5 text-sm text-quiet" aria-live="polite">
              {label}
            </p>
            {over && <p className="mt-1 text-xs font-semibold text-working">{over}</p>}
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <span className="text-xs text-quiet">Real size</span>
            <span
              data-tile="dark"
              className="flex h-[76px] w-[100px] items-center justify-center rounded-xl bg-field"
            >
              {preview(56, realSizeUrl)}
            </span>
            <span
              data-tile="light"
              className="flex h-[76px] w-[100px] items-center justify-center rounded-xl bg-paper"
            >
              {preview(56, realSizeUrl)}
            </span>
          </div>
        </section>

        <section aria-label="Choose an avatar" className={CARD}>
          {chooser}
        </section>
      </div>
    </Page>
  );
}
