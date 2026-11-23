import type { FloatingIconStatus } from "@/components/avatar/floatingIconGeometry";

export type AvatarLibrary = "male" | "female";

export type Gender = "MALE" | "FEMALE";

/** The Users filter: a gender, or the people who have none yet. */
export type GenderFilter = Gender | "UNSET";

export interface AvatarManifestItem {
  id: string;
  gender: AvatarLibrary;
  set: number;
  /** Size in pixels to URL; each URL carries a content hash. */
  files: Record<string, string>;
}

export interface AvatarManifest {
  version: number;
  defaults: Record<AvatarLibrary, string>;
  avatars: AvatarManifestItem[];
}

/** GET /me/avatar */
export interface MyAvatar {
  /** What the person shows: their choice or the default; null while they have no gender. */
  avatarId: string | null;
  chosenAvatarId: string | null;
  defaultAvatarId: string | null;
  library: AvatarLibrary | null;
}

/** GET /me/day-progress */
export interface DayProgress {
  status: FloatingIconStatus;
  date: string;
  workedSec: number;
  targetSec: number;
  targetFromShift: boolean;
  overSec: number;
  breakStartedAt: string | null;
  breakEndsAt: string | null;
  meetingStartedAt: string | null;
  meetingPromptAt: string | null;
  meetingFallbackAt: string | null;
}

/** The socket's `avatar:changed`. */
export interface AvatarChanged {
  userId: string;
  avatarId: string | null;
}
