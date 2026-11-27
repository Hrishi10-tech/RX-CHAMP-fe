"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";

import { FloatingIcon } from "@/components/avatar/FloatingIcon";
import { PersonAvatar } from "@/components/avatar/PersonAvatar";
import { AVATAR_ROUTE, ROLE_LABEL } from "@/constants/roles";
import { useSession } from "@/features/auth/hooks/useSession";
import { ProfileTrail } from "@/features/avatars/components/ProfileTrail";
import { useAvatarUrl, useDayProgress, useOwnAvatarId } from "@/features/avatars/hooks/useAvatars";
import {
  DAY_NOT_LOADED,
  dayLabel,
  overTargetLabel,
  progressOf,
} from "@/features/avatars/lib/dayLabel";
import { useLiveAvatarId } from "@/features/avatars/lib/liveAvatars";
import { getUser } from "@/features/users/api/getUser";
import { initialsOf } from "@/lib/text/initials";

const ROW = "flex min-h-[3.25rem] items-center justify-between gap-4 px-5 py-3 text-sm";

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className={ROW}>
      <span className="text-quiet">{label}</span>
      <span className="min-w-0 truncate text-right font-medium text-primary">
        {value || "Not set"}
      </span>
    </div>
  );
}

/**
 * Settings, Profile: who you are and the way into your avatar, in the shape of the phone's
 * Profile screen (design page 11). For every portal role (4.0).
 */
export function ProfileSettings() {
  const { user, role, me } = useSession();
  const ownAvatarId = useOwnAvatarId();
  const avatarId = useLiveAvatarId(user?.id, ownAvatarId);
  const iconUrl = useAvatarUrl(avatarId, 96);
  const day = useDayProgress();
  const details = useQuery({
    queryKey: ["users", user?.id, "profile"],
    queryFn: () => getUser(user!.id),
    enabled: !!user,
  });

  const name = details.data?.name ?? user?.name ?? user?.email ?? "";
  // 4.0: Staff and Managers belong to departments; GET /me names them.
  const department =
    me?.department?.name ||
    me?.departments.map((d) => d.name).join(", ") ||
    (typeof details.data?.department === "string" ? details.data.department : null);
  // Nothing known yet: a hollow dot and no words, never a status the person may not be in.
  const progress = day.data;
  const over = progress ? overTargetLabel(progress.status, progress.overSec) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <ProfileTrail title="Profile" />

      <section
        aria-label="Your profile"
        className="overflow-hidden rounded-2xl border border-card bg-card text-primary shadow-sm"
      >
        <div className="flex flex-col items-center px-5 pb-6 pt-7 text-center">
          <FloatingIcon
            imageUrl={iconUrl}
            initials={initialsOf(name)}
            status={progress?.status ?? "NOT_STARTED"}
            progress={progress ? progressOf(progress.workedSec, progress.targetSec) : 0}
            size={96}
          />
          <p className="mt-4 text-lg font-semibold">{name}</p>
          {department && <p className="text-sm text-quiet">{department}</p>}
          <p className="mt-2 min-h-4 text-xs text-quiet">
            {progress
              ? dayLabel(
                  progress.status,
                  progress.workedSec,
                  progress.targetSec,
                  progress.date,
                  progress.remote,
                )
              : day.isError && DAY_NOT_LOADED}
          </p>
          {over && <p className="mt-0.5 text-xs font-semibold text-working">{over}</p>}
        </div>

        <div className="divide-y divide-card border-t border-card">
          <Link
            href={AVATAR_ROUTE}
            className={`${ROW} font-semibold transition-colors hover:bg-fill focus-visible:bg-fill focus-visible:outline-none`}
          >
            <span>Avatar</span>
            <span className="flex items-center gap-2.5">
              <PersonAvatar name={name} avatarId={avatarId} userId={user?.id} size={28} />
              <ChevronRight className="h-4 w-4 text-quiet" aria-hidden />
            </span>
          </Link>
          <DetailRow label="Email" value={user?.email} />
          <DetailRow label="Role" value={role ? ROLE_LABEL[role] : null} />
          {me?.organisation && <DetailRow label="Organisation" value={me.organisation.name} />}
          <DetailRow label="Designation" value={details.data?.designation} />
        </div>
      </section>
    </div>
  );
}
