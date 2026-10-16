"use client";

import { useEffect, useState } from "react";

import type { ActivityStatus } from "@/features/activity/types";
import type {
  ActivityMe,
  ActivityUpdate,
  AppUsageRow,
  CurrentApp,
  LiveActivityData,
  LiveStatus,
  PresenceStatus,
  PresenceUpdate,
} from "@/features/analytics/types";
import { acquireActivitySocket, releaseActivitySocket } from "@/features/activity/lib/socket";
import { acquirePresenceSocket, releasePresenceSocket } from "@/features/presence/lib/socket";
import { getUserCurrent } from "@/features/activity/api/getUserCurrent";
import { getMemberPresence } from "@/features/presence/api/getMemberPresence";
import { useAppSelector } from "@/store/hooks";

function combine(
  activity: ActivityStatus | null,
  presence: PresenceStatus | null,
): LiveStatus | null {
  if (presence && presence !== "WORKING") return presence;
  if (!activity) return null;
  return activity;
}

export function useLiveStatus(userId: string): {
  status: LiveStatus | null;
  connected: boolean;
  live: LiveActivityData;
  current: CurrentApp | null;
  /**
   * Bumped on every presence change for this user. Break / lunch / meeting totals
   * are only recomputed server-side, so callers watch this to refetch them.
   */
  presenceVersion: number;
} {
  const [activity, setActivity] = useState<ActivityStatus | null>(null);
  const [presence, setPresence] = useState<PresenceStatus | null>(null);
  // Until the first presence answer lands, the activity status alone would read
  // "Active" for someone who is on a break: show no status rather than a wrong one.
  const [presenceKnown, setPresenceKnown] = useState(false);
  const [connected, setConnected] = useState(false);
  const [current, setCurrent] = useState<CurrentApp | null>(null);
  const [presenceVersion, setPresenceVersion] = useState(0);
  const myId = useAppSelector((state) => state.auth.user?.id ?? null);
  const self = myId !== null && myId === userId;
  const [live, setLive] = useState<LiveActivityData>({
    activeSec: null,
    idleSec: null,
    topApps: null,
  });

  useEffect(() => {
    let active = true;
    // Clear every per-user field, or the previous member's status/figures show
    // against the next one until fresh data lands.
    setLive({ activeSec: null, idleSec: null, topApps: null });
    setCurrent(null);
    setActivity(null);
    setPresence(null);
    setPresenceKnown(false);

    const seedActivity = () =>
      getUserCurrent(userId)
        .then((c) => {
          if (!active) return;
          setActivity(c.status);
          setCurrent({ app: c.app, title: c.title, url: c.url });
        })
        .catch(() => {});

    // `presence:update` only fires on a change, so a break already running when
    // the page opens would never show. Seed it from this person's current status
    // (your own for My Dashboard, so Staff never call a manager-only endpoint).
    const seedPresence = () =>
      getMemberPresence(userId, self)
        .then((p) => {
          if (!active) return;
          if (p?.status) setPresence(p.status);
          setPresenceKnown(true);
        })
        .catch(() => {
          // Unknown presence falls back to the activity status.
          if (active) setPresenceKnown(true);
        });

    void seedActivity();
    void seedPresence();

    const aSock = acquireActivitySocket();
    const pSock = acquirePresenceSocket();
    const syncConn = () => setConnected(aSock.connected || pSock.connected);
    syncConn();

    // A dropped socket (the access cookie expiring mid-session) misses whatever
    // changed while it was away, so re-seed once it is back rather than waiting
    // for the next transition.
    const onActivityConnect = () => {
      syncConn();
      void seedActivity();
    };
    const onPresenceConnect = () => {
      syncConn();
      void seedPresence();
    };

    const applyFigures = (u: { activeSec?: number; idleSec?: number; topApps?: AppUsageRow[] }) =>
      setLive((prev) => ({
        activeSec: u.activeSec ?? prev.activeSec,
        idleSec: u.idleSec ?? prev.idleSec,
        topApps: u.topApps ?? prev.topApps,
      }));

    const onActivityUpdate = (u: ActivityUpdate) => {
      if (u.userId !== userId) return;
      setActivity(u.status);
      setCurrent({ app: u.app ?? null, title: u.title ?? null, url: u.url ?? null });
      applyFigures(u);
    };
    const onActivityMe = (u: ActivityMe) => {
      if (u?.current?.status) setActivity(u.current.status);
      if (u?.current)
        setCurrent({
          app: u.current.app ?? null,
          title: u.current.title ?? null,
          url: u.current.url ?? null,
        });
      applyFigures(u);
    };
    const onPresenceUpdate = (u: PresenceUpdate) => {
      if (u.userId !== userId) return;
      setPresence(u.status);
      setPresenceKnown(true);
      // Signal callers that the day's break/lunch/meeting totals have moved on.
      setPresenceVersion((v) => v + 1);
    };

    aSock.on("activity:update", onActivityUpdate);
    aSock.on("activity:me", onActivityMe);
    pSock.on("presence:update", onPresenceUpdate);
    aSock.on("connect", onActivityConnect);
    pSock.on("connect", onPresenceConnect);
    aSock.on("disconnect", syncConn);
    pSock.on("disconnect", syncConn);

    return () => {
      active = false;
      aSock.off("activity:update", onActivityUpdate);
      aSock.off("activity:me", onActivityMe);
      pSock.off("presence:update", onPresenceUpdate);
      aSock.off("connect", onActivityConnect);
      pSock.off("connect", onPresenceConnect);
      aSock.off("disconnect", syncConn);
      pSock.off("disconnect", syncConn);
      releaseActivitySocket();
      releasePresenceSocket();
    };
  }, [userId, self]);

  return {
    status: presenceKnown ? combine(activity, presence) : null,
    connected,
    live,
    current,
    presenceVersion,
  };
}
