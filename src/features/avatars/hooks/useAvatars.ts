"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";

import {
  avatarKeys,
  getAvatarManifest,
  getDayProgress,
  getMyAvatar,
  resetMyAvatar,
  setMyAvatar,
} from "@/features/avatars/api/avatars";
import { setLiveAvatar } from "@/features/avatars/lib/liveAvatars";
import type {
  AvatarChanged,
  AvatarManifest,
  AvatarManifestItem,
  MyAvatar,
} from "@/features/avatars/types";
import { useAppSelector } from "@/store/hooks";
import { getSession, saveSession } from "@/lib/auth/session";

const HOUR = 3_600_000;

/** The library changes with a deploy, not during a session. */
export function useAvatarManifest(enabled = true) {
  return useQuery({
    queryKey: avatarKeys.manifest(),
    queryFn: getAvatarManifest,
    enabled,
    staleTime: HOUR,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
  });
}

const indexes = new WeakMap<AvatarManifest, Map<string, AvatarManifestItem>>();

function indexOf(manifest: AvatarManifest): Map<string, AvatarManifestItem> {
  let index = indexes.get(manifest);
  if (!index) {
    index = new Map(manifest.avatars.map((a) => [a.id, a]));
    indexes.set(manifest, index);
  }
  return index;
}

/** The smallest generated size that stays sharp on a two-times display. */
export function fileSizeFor(pixels: number): string {
  const wanted = pixels * 2;
  return String([48, 96, 144, 192].find((size) => size >= wanted) ?? 192);
}

/** The image for an avatar at a display size; null until the library is known. */
export function useAvatarUrl(avatarId: string | null | undefined, pixels: number): string | null {
  const { data } = useAvatarManifest(!!avatarId);
  if (!avatarId || !data) return null;
  return indexOf(data).get(avatarId)?.files[fileSizeFor(pixels)] ?? null;
}

export function useMyAvatar(enabled = true) {
  return useQuery({
    queryKey: avatarKeys.mine(),
    queryFn: getMyAvatar,
    enabled,
    staleTime: 5 * 60_000,
  });
}

/**
 * The signed-in person's avatar. The session cookie answers at once (no flash of initials
 * on every page load) and is kept in step with the API, so the next load starts right.
 */
export function useOwnAvatarId(): string | null {
  const user = useAppSelector((state) => state.auth.user);
  const { data } = useMyAvatar(!!user);
  const avatarId = data ? data.avatarId : (user?.avatarId ?? null);
  useEffect(() => {
    if (!data) return;
    const session = getSession();
    if (session?.user && session.user.avatarId !== data.avatarId) {
      saveSession({ user: { ...session.user, avatarId: data.avatarId } });
    }
  }, [data]);
  return avatarId;
}

/**
 * Re-read every minute, and on the `workday:changed` push (see useNotifications). Every read
 * renders, even an identical answer: the words for an ended day depend on today's date.
 */
export function useDayProgress(enabled = true) {
  return useQuery({
    queryKey: avatarKeys.dayProgress(),
    queryFn: getDayProgress,
    enabled,
    refetchInterval: 60_000,
    notifyOnChangeProps: "all",
  });
}

function afterMyChange(client: QueryClient, userId: string | undefined, view: MyAvatar): void {
  client.setQueryData(avatarKeys.mine(), view);
  if (userId) setLiveAvatar(userId, view.avatarId);
}

export function useSetMyAvatar() {
  const client = useQueryClient();
  const userId = useAppSelector((state) => state.auth.user?.id);
  return useMutation({
    mutationFn: setMyAvatar,
    onSuccess: (view) => afterMyChange(client, userId, view),
  });
}

export function useResetMyAvatar() {
  const client = useQueryClient();
  const userId = useAppSelector((state) => state.auth.user?.id);
  return useMutation({
    mutationFn: resetMyAvatar,
    onSuccess: (view) => afterMyChange(client, userId, view),
  });
}

/** One `avatar:changed` from the socket: every PersonAvatar updates, and your own record. */
export function applyAvatarChange(
  client: QueryClient,
  change: AvatarChanged,
  myId: string | undefined,
): void {
  setLiveAvatar(change.userId, change.avatarId);
  if (change.userId === myId) void client.invalidateQueries({ queryKey: avatarKeys.mine() });
}
