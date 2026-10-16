import type { ApprovalItemView } from "@/features/approvals/types";
import {
  atStakeText,
  categoryChip,
  decidedLine,
  dueChip,
  effectChip,
  fallbackEffectText,
  firstName,
  formatTimer,
  liveSeconds,
  mayReopen,
  reasonLabel,
} from "./labels";

type DueFields = Pick<
  ApprovalItemView,
  "status" | "dueAt" | "dueInSec" | "dueSoon" | "overdue" | "escalated"
>;

function due(patch: Partial<DueFields>): DueFields {
  return {
    status: "PENDING",
    dueAt: null,
    dueInSec: null,
    dueSoon: false,
    overdue: false,
    escalated: false,
    ...patch,
  };
}

const H = 3600;

describe("dueChip", () => {
  it("is grey with the hours left when there is time", () => {
    expect(dueChip(due({ dueInSec: 31 * H + 20 * 60 }))).toMatchObject({
      text: "Due in 31h",
      tone: "neutral",
    });
  });

  it("turns amber at 12 hours or less", () => {
    expect(dueChip(due({ dueInSec: 5 * H + 59 * 60, dueSoon: true }))).toMatchObject({
      text: "Due in 5h",
      tone: "warning",
    });
    // The 12-hour line holds even when the flag is missing.
    expect(dueChip(due({ dueInSec: 12 * H }))?.tone).toBe("warning");
    expect(dueChip(due({ dueInSec: 40 * 60 }))?.text).toBe("Due in 40 min");
  });

  it("turns red once overdue", () => {
    expect(dueChip(due({ dueInSec: -6 * H - 10 * 60, overdue: true }))).toMatchObject({
      text: "Overdue 6h",
      tone: "danger",
    });
    expect(dueChip(due({ dueInSec: -20 }))?.text).toBe("Overdue 1 min");
  });

  it("says Escalated once the Super Admins have it", () => {
    const chip = dueChip(due({ dueInSec: -3 * H, overdue: true, escalated: true }));
    expect(chip).toMatchObject({ text: "Escalated", tone: "danger" });
    expect(chip?.title).toMatch(/Overdue 3h/);
  });

  it("works from dueAt when the server sent no seconds", () => {
    const now = Date.parse("2026-10-13T10:00:00Z");
    expect(dueChip(due({ dueAt: "2026-10-14T17:00:00Z" }), now)?.text).toBe("Due in 31h");
  });

  it("has none for decided items or without a due time", () => {
    expect(dueChip(due({ status: "APPROVED", dueInSec: 100 }))).toBeNull();
    expect(dueChip(due({}))).toBeNull();
  });
});

describe("effectChip", () => {
  const item = (
    mode: "PLUS" | "MINUS" | "NONE",
    status: "PENDING" | "APPROVED" | "REJECTED",
    text = "",
  ) => ({ effect: { mode, minutes: 15, text }, status });

  it("uses the server's text, with a true minus sign", () => {
    expect(effectChip(item("MINUS", "PENDING", "-15 min if rejected"))).toEqual({
      text: "−15 min if rejected",
      tone: "danger",
    });
    expect(effectChip(item("PLUS", "PENDING", "+15 min if approved"))).toEqual({
      text: "+15 min if approved",
      tone: "success",
    });
  });

  it("fills the chip once minutes moved, greys it when nothing did", () => {
    expect(effectChip(item("PLUS", "APPROVED", "+15 min added")).tone).toBe("successSolid");
    expect(effectChip(item("MINUS", "REJECTED", "−15 min taken off")).tone).toBe("dangerSolid");
    expect(effectChip(item("MINUS", "APPROVED", "Counted as focus time")).tone).toBe("neutral");
    expect(effectChip(item("NONE", "PENDING", "No change to focus time")).tone).toBe("neutral");
  });

  it("writes its own line when the server sent none", () => {
    expect(effectChip(item("PLUS", "PENDING")).text).toBe("+15 min if approved");
    expect(effectChip(item("MINUS", "PENDING")).text).toBe("−15 min if rejected");
    expect(fallbackEffectText({ mode: "PLUS", minutes: 15, text: "" }, "APPROVED")).toBe(
      "+15 min added",
    );
    expect(fallbackEffectText({ mode: "MINUS", minutes: 15, text: "" }, "REJECTED")).toBe(
      "−15 min taken off",
    );
    expect(fallbackEffectText({ mode: "MINUS", minutes: 15, text: "" }, "APPROVED")).toBe(
      "Counted as focus time",
    );
    expect(fallbackEffectText({ mode: "PLUS", minutes: 11, text: "" }, "REJECTED")).toBe(
      "11 min left out",
    );
    expect(fallbackEffectText({ mode: "NONE", minutes: 0, text: "" }, "PENDING")).toBe(
      "No change to focus time",
    );
    expect(fallbackEffectText({ mode: "MINUS", minutes: 90, text: "" }, "PENDING")).toBe(
      "−1h 30m if rejected",
    );
  });
});

describe("row wording", () => {
  it("names categories, and reads an unknown one plainly", () => {
    expect(categoryChip("BREAK_AUTO_SKIP")).toEqual({ label: "Auto-skipped", tone: "neutral" });
    // "Live" only while the meeting runs; days later it is just a meeting.
    expect(categoryChip("MEETING_LIVE", true).label).toBe("Live meeting");
    expect(categoryChip("MEETING_LIVE")).toEqual({ label: "Meeting", tone: "brand" });
    expect(categoryChip("MEETING_PAST", false).label).toBe("Logged meeting");
    expect(categoryChip("BREAK_NEW_KIND")).toEqual({ label: "break new kind", tone: "neutral" });
  });

  it("labels the text box by what it holds", () => {
    expect(reasonLabel("MEETING_PAST")).toBe("Agenda");
    expect(reasonLabel("BREAK_OVERRUN")).toBe("Why it ran over");
    expect(reasonLabel("BREAK_AUTO_SKIP")).toBe("Comment");
    expect(reasonLabel("BREAK_SKIP")).toBe("Reason");
  });

  it("says who decided and when", () => {
    const today = "2026-10-13";
    expect(
      decidedLine(
        { status: "APPROVED", decidedAt: "2026-10-13T06:35:00Z", decidedByName: "Maya Reddy" },
        today,
      ),
    ).toBe("Approved by Maya Reddy at 12:05");
    expect(
      decidedLine(
        { status: "REJECTED", decidedAt: "2026-10-12T12:50:00Z", decidedByName: null },
        today,
      ),
    ).toBe("Rejected on 12 Oct, 18:20");
    expect(decidedLine({ status: "PENDING", decidedAt: null, decidedByName: null }, today)).toBe(
      null,
    );
  });

  it("takes a first name", () => {
    expect(firstName("Asha Kumar")).toBe("Asha");
    expect(firstName("  ")).toBe("They");
  });
});

describe("live meetings", () => {
  it("runs a timer from the server's seconds", () => {
    expect(liveSeconds(600, 1_000, 31_000)).toBe(630);
    expect(formatTimer(245)).toBe("4:05");
    expect(formatTimer(3600 + 245)).toBe("1:04:05");
    expect(formatTimer(Number.NaN)).toBe("0:00");
  });
});

describe("atStakeText", () => {
  it("sums what the pending items can still do", () => {
    const pending = (mode: "PLUS" | "MINUS" | "NONE", minutes: number, overdue = false) => ({
      status: "PENDING" as const,
      overdue,
      escalated: false,
      effect: { mode, minutes, text: "" },
    });
    expect(
      atStakeText([
        pending("PLUS", 11),
        pending("PLUS", 9, true),
        pending("MINUS", 90),
        pending("NONE", 0),
      ]),
    ).toBe("4 waiting, 1 overdue. Approving can add +20 min. Rejecting can remove up to −1h 30m.");
    expect(atStakeText([])).toBe("Nothing waiting.");
  });
});

describe("mayReopen", () => {
  const decided = { status: "APPROVED" as const, decidedById: "m-1", decidedByName: "Asha Rao" };

  it("lets whoever decided reopen, matched by id, and any Super Admin", () => {
    expect(mayReopen(decided, { id: "m-1", name: "Someone Else", isSuperAdmin: false })).toBe(true);
    expect(mayReopen(decided, { id: "m-2", name: "Asha Rao", isSuperAdmin: false })).toBe(false);
    expect(mayReopen(decided, { id: "sa-1", isSuperAdmin: true })).toBe(true);
  });

  it("offers nothing on a pending item, or when the decider is unknown", () => {
    expect(mayReopen({ ...decided, status: "PENDING" }, { id: "m-1", isSuperAdmin: true })).toBe(
      false,
    );
    expect(mayReopen({ ...decided, decidedById: null }, { id: "m-1", isSuperAdmin: false })).toBe(
      false,
    );
  });

  it("falls back to the name for an API without decidedById", () => {
    const older = { status: "REJECTED", decidedByName: "Asha Rao" } as Parameters<
      typeof mayReopen
    >[0];
    expect(mayReopen(older, { name: "Asha Rao", isSuperAdmin: false })).toBe(true);
    expect(mayReopen(older, { name: "Ravi K", isSuperAdmin: false })).toBe(false);
  });
});
