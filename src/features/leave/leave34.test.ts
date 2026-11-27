import { canAccess, type Role } from "@/constants/roles";
import { notificationHref } from "@/features/notifications/lib/links";

describe("3.4 leave: who opens the page, where notices go", () => {
  it("every role opens Leave (4.1: Staff their own leave and comp off)", () => {
    for (const role of ["SUPER_ADMIN", "SUPER_MANAGER", "ADMIN", "MANAGER", "USER"] as Role[]) {
      expect([role, canAccess(role, "/dashboard/leave")]).toEqual([role, true]);
    }
    expect(notificationHref("COMPOFF_DECIDED", "USER")).toBe("/dashboard/leave?tab=compoff");
    expect(notificationHref("LEAVE_DECIDED", "USER")).toBe("/dashboard/leave");
  });

  it("a request or a cancellation opens the approver's queue; the rest the person's leave", () => {
    expect(notificationHref("LEAVE_REQUESTED")).toBe("/dashboard/leave?tab=requests");
    expect(notificationHref("LEAVE_CANCELLED")).toBe("/dashboard/leave?tab=requests");
    for (const t of ["LEAVE_DECIDED", "LEAVE_REVOKED", "LEAVE_ADJUSTED", "LEAVE_UPDATED"]) {
      expect(notificationHref(t)).toBe("/dashboard/leave");
    }
  });
});
