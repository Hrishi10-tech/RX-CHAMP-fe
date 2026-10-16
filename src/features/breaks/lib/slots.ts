import type { BreakSlotView, TeamCellStatus } from "@/features/breaks/types";

/**
 * Where one of today's breaks stands for the person: the same states the team
 * view uses, worked out from the slot's instants and the server's clock (not the
 * browser's, which may be off).
 */
export function slotStatus(
  slot: Pick<BreakSlotView, "windowOpen" | "windowClose" | "record">,
  nowMs: number,
): TeamCellStatus {
  if (slot.record) {
    // 3.1: a skip is a record too, but nothing was taken.
    if (slot.record.outcome === "SKIPPED" || slot.record.outcome === "AUTO_SKIPPED") {
      return slot.record.outcome;
    }
    return slot.record.inProgress ? "IN_PROGRESS" : "TAKEN";
  }
  const open = Date.parse(slot.windowOpen);
  const close = Date.parse(slot.windowClose);
  if (nowMs < open) return "UPCOMING";
  if (nowMs >= close) return "MISSED";
  return "OPEN";
}

/**
 * The server's "now", carried forward from when it was read. `serverNow` came
 * with the response fetched at `fetchedAt` (browser ms).
 */
export function serverClock(serverNow: string, fetchedAt: number, browserNow = Date.now()): number {
  const server = Date.parse(serverNow);
  if (Number.isNaN(server) || !fetchedAt) return browserNow;
  return server + Math.max(0, browserNow - fetchedAt);
}
