"use client";

import Image from "next/image";

import { useAvatarUrl } from "@/features/avatars/hooks/useAvatars";
import { useLiveAvatarId } from "@/features/avatars/lib/liveAvatars";
import { initialsOf } from "@/lib/text/initials";

import { useImageFallback } from "./useImageFallback";

const BEZEL = "bg-[linear-gradient(145deg,#6F7784_0%,#474E5A_50%,#2A2F38_100%)]";

export interface PersonAvatarProps {
  /** For the initials, while the person has no gender (and until the image is there). */
  name: string;
  /** The effective avatar from the API; null while the person has no gender. */
  avatarId?: string | null;
  /** Lets `avatar:changed` update this picture live. */
  userId?: string;
  /** Rendered size in pixels. */
  size?: number;
  className?: string;
}

/**
 * A person wherever the portal shows one: their preset avatar in a small graphite bezel,
 * or their initials in the same bezel while they have no gender.
 */
export function PersonAvatar({
  name,
  avatarId,
  userId,
  size = 36,
  className = "",
}: PersonAvatarProps) {
  const liveId = useLiveAvatarId(userId, avatarId);
  const url = useAvatarUrl(liveId, size);
  const { broken, onError } = useImageFallback(url);
  const edge = Math.max(1.5, size * 0.055);
  const inner = Math.round(size - edge * 2);

  return (
    <span
      aria-hidden
      data-part="bezel"
      data-avatar-id={liveId ?? undefined}
      className={`inline-flex shrink-0 items-center justify-center rounded-full shadow-sm ${BEZEL} ${className}`}
      style={{ width: size, height: size }}
    >
      {url && !broken ? (
        <Image
          unoptimized
          src={url}
          alt=""
          width={inner}
          height={inner}
          draggable={false}
          onError={onError}
          className="rounded-full bg-fill object-cover"
          style={{ width: inner, height: inner }}
        />
      ) : (
        <span
          className="flex items-center justify-center rounded-full bg-fill font-semibold text-body"
          style={{ width: inner, height: inner, fontSize: Math.max(9, Math.round(size * 0.32)) }}
        >
          {initialsOf(name)}
        </span>
      )}
    </span>
  );
}
