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
import { getTeamLive } from "@/features/presence/api/getTeamLive";

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
  const [connected, setConnected] = useState(false);
  const [current, setCurrent] = useState<CurrentApp | null>(null);
  const [presenceVersion, setPresenceVersion] = useState(0);
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

    const seedActivity = () =>
      getUserCurrent(userId)
        .then((c) => {
          if (!active) return;
          setActivity(c.status);
          setCurrent({ app: c.app, title: c.title, url: c.url });
        })
        .catch(() => {});

    // `presence:update` only fires on a change, so a break already running when
    // the page opens would never show. Seed it from the manager's live team board.
    const seedPresence = () =>
      getTeamLive()
        .then((rows) => {
          if (!active) return;
          const row = rows.find((r) => r.userId === userId);
          if (row) setPresence(row.status);
        })
        .catch(() => {});

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
  }, [userId]);

  return { status: combine(activity, presence), connected, live, current, presenceVersion };
}
