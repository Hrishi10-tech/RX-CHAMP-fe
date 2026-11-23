"use client";

import type { Ref } from "react";

import { FloatingIcon } from "@/components/avatar/FloatingIcon";
import { useAvatarManifest, useAvatarUrl } from "@/features/avatars/hooks/useAvatars";
import type { AvatarLibrary, Gender } from "@/features/avatars/types";
import { initialsOf } from "@/lib/text/initials";

const OPTIONS: { value: Gender; label: string }[] = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
];

export const LIBRARY_OF: Record<Gender, AvatarLibrary> = { MALE: "male", FEMALE: "female" };

/**
 * Male or Female as two segments (design page 8). It picks the avatar library and the
 * default avatar. 4.0: only the organisation admin and Super Admins see this field
 * (canSetGender); the API refuses anyone else.
 */
export function GenderField({
  value,
  onChange,
  disabled = false,
  invalid = false,
  labelledBy,
  firstOptionRef,
}: {
  value: Gender | null;
  onChange: (next: Gender) => void;
  disabled?: boolean;
  invalid?: boolean;
  /** The id of the visible label. */
  labelledBy: string;
  /** A form focuses this when the field is required and empty. */
  firstOptionRef?: Ref<HTMLButtonElement>;
}) {
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-invalid={invalid || undefined}
      className={`mt-1.5 grid max-w-xs grid-cols-2 gap-1 rounded-xl border bg-fill p-1 ${
        invalid ? "border-attention" : "border-card"
      }`}
    >
      {OPTIONS.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={index === 0 ? firstOptionRef : undefined}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 disabled:cursor-not-allowed disabled:opacity-60 ${
              selected
                ? "bg-card text-primary shadow-sm ring-1 ring-edge"
                : "text-quiet hover:text-strong"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** The default a gender gives, from the manifest. */
export function useDefaultAvatar(gender: Gender | null) {
  const { data } = useAvatarManifest();
  if (!gender || !data) return { id: null, count: 0 };
  const library = LIBRARY_OF[gender];
  return {
    id: data.defaults[library],
    count: data.avatars.filter((a) => a.gender === library).length,
  };
}

/** "Default avatar: M01" under the field on Add user (design page 8). */
export function DefaultAvatarCard({
  gender,
  firstName,
  webToo,
}: {
  gender: Gender;
  firstName: string;
  /** Everyone but Staff can also change it on the web. */
  webToo: boolean;
}) {
  const { id, count } = useDefaultAvatar(gender);
  const url = useAvatarUrl(id, 56);
  const who = firstName.trim() || "They";
  const where = webToo
    ? "from the agent, the mobile app or the web"
    : "from the agent or the mobile app";
  return (
    <div className="mt-3 flex items-center gap-4 rounded-xl border border-card bg-fill p-4">
      <FloatingIcon
        imageUrl={url}
        initials={firstName.trim() ? initialsOf(firstName) : undefined}
        status="NOT_STARTED"
        progress={0}
        size={56}
      />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-primary">Default avatar{id ? `: ${id}` : ""}</p>
        <p className="mt-0.5 text-sm text-quiet">
          Set from gender. {who} can switch to any of the {count > 0 ? `${count} ` : ""}
          {LIBRARY_OF[gender]} avatars {where}.
        </p>
      </div>
    </div>
  );
}
