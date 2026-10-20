import { portalRefused, readMe, readPermissions } from "@/features/auth/api/getMe";
import { resolveSignIn } from "@/features/auth/lib/signIn";

jest.mock("@/lib/api", () => ({ apiClient: { get: jest.fn() } }));

/** A 4.0 `GET /me` answer as the API sends it. */
function meAnswer(overrides: Record<string, unknown> = {}) {
  return {
    id: "m-1",
    name: "Maya Reddy",
    firstName: "Maya",
    lastName: "Reddy",
    email: "maya@example.test",
    role: "MANAGER",
    organisation: { id: "o-1", name: "Acme" },
    department: null,
    departments: [{ id: "d-1", name: "Engineering", icon: "code" }],
    grants: { screenshots: false, timeline: true, activity: false },
    permissions: {
      canManageOrganisations: false,
      canManageOrg: false,
      canManagePeople: false,
      canManageDepartments: false,
      canManageShifts: false,
      canSeeTeam: true,
      canSeeScreenshots: false,
      canSeeTimeline: true,
      canSeeActivity: false,
      canApprove: true,
      canSeeReports: true,
      canSeeTeamBreaks: true,
      canUseMessages: true,
      canUsePortal: true,
      needsOrganisation: false,
    },
    ...overrides,
  };
}

describe("GET /me permissions", () => {
  it("reads the permission flags, false when missing", () => {
    const me = readMe(meAnswer());
    expect(me.permissions).toMatchObject({
      canSeeTeam: true,
      canUsePortal: true,
      canManagePeople: false,
    });
    expect(readPermissions({ canUsePortal: true })).toMatchObject({
      canUsePortal: true,
      canSeeTeam: false,
    });
  });

  it("keeps working with an API that sends no permissions", () => {
    expect(readMe(meAnswer({ permissions: undefined })).permissions).toBeNull();
  });

  it("refuses Staff, and anyone the server says may not use the portal", () => {
    expect(portalRefused(readMe(meAnswer()))).toBe(false);
    expect(portalRefused(readMe(meAnswer({ role: "USER" })))).toBe(true);
    const blocked = meAnswer();
    (blocked.permissions as Record<string, boolean>).canUsePortal = false;
    expect(portalRefused(readMe(blocked))).toBe(true);
    expect(portalRefused(null)).toBe(false);
  });

  it("signs in a manager, refuses canUsePortal false as staff", async () => {
    const ok = await resolveSignIn({ id: "m-1", email: "maya@example.test" }, async () =>
      readMe(meAnswer()),
    );
    expect(ok).toMatchObject({ ok: true, role: "MANAGER" });
    const blocked = meAnswer();
    (blocked.permissions as Record<string, boolean>).canUsePortal = false;
    const refused = await resolveSignIn({ id: "m-1", email: "maya@example.test" }, async () =>
      readMe(blocked),
    );
    expect(refused).toEqual({ ok: false, reason: "staff" });
  });
});
