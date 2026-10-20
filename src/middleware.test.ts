/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

import { middleware, movedTo } from "./middleware";
import { SESSION_COOKIE, encodeSession } from "@/lib/auth/session";
import { NO_GRANTS, type Grants } from "@/constants/roles";

function request(path: string, role?: string, grants?: Grants): NextRequest {
  const req = new NextRequest(new URL(path, "https://portal.test"));
  if (role) {
    req.cookies.set(
      SESSION_COOKIE,
      encodeSession({ user: { id: "u1", email: "a@b.c", role, grants } }),
    );
  }
  return req;
}

function location(res: Response): string | null {
  const loc = res.headers.get("location");
  return loc ? new URL(loc).pathname + new URL(loc).search : null;
}

describe("movedTo", () => {
  it.each([
    ["/dashboard/team-today", "/dashboard/team"],
    ["/dashboard/team-today/", "/dashboard/team"],
    ["/dashboard/me", "/dashboard/overview"],
    ["/dashboard/admin", "/dashboard/overview"],
    ["/dashboard/manager", "/dashboard/overview"],
    ["/dashboard/admin/team-management", "/dashboard/people"],
    ["/dashboard/admin/team-management/organization", "/dashboard/organisations"],
    ["/dashboard/admin/team-management/organization/c1/manager/m2", "/dashboard/organisations"],
    ["/dashboard/manager/activity/u-7", "/dashboard/team/u-7"],
    ["/dashboard/breaks/approvals", "/dashboard/approvals"],
  ])("%s lives at %s", (from, to) => {
    expect(movedTo(from)).toBe(to);
  });

  it("leaves current pages alone", () => {
    expect(movedTo("/dashboard/team")).toBeNull();
    expect(movedTo("/dashboard/overview")).toBeNull();
  });
});

describe("middleware", () => {
  it("sends a visitor without a session to sign in, remembering the page", () => {
    expect(location(middleware(request("/dashboard/team")))).toBe(
      "/auth/login?redirect=%2Fdashboard%2Fteam",
    );
  });

  it("refuses Staff with the app message and drops their cookie", () => {
    const res = middleware(request("/dashboard/overview", "USER"));
    expect(location(res)).toBe("/auth/login?reason=staff");
    expect(res.headers.get("set-cookie") ?? "").toContain(`${SESSION_COOKIE}=;`);
  });

  it("redirects Team today to Team", () => {
    expect(location(middleware(request("/dashboard/team-today", "ADMIN")))).toBe("/dashboard/team");
  });

  it("starts every portal role on the overview", () => {
    for (const role of ["SUPER_ADMIN", "ADMIN", "MANAGER"]) {
      expect(location(middleware(request("/dashboard", role)))).toBe("/dashboard/overview");
    }
  });

  it("keeps a manager out of Team management and Settings", () => {
    expect(location(middleware(request("/dashboard/people", "MANAGER")))).toBe(
      "/dashboard/overview",
    );
    expect(location(middleware(request("/dashboard/settings", "MANAGER")))).toBe(
      "/dashboard/overview",
    );
  });

  it("lets a manager onto Team only with a grant", () => {
    expect(location(middleware(request("/dashboard/team", "MANAGER", NO_GRANTS)))).toBe(
      "/dashboard/overview",
    );
    expect(
      middleware(
        request("/dashboard/team", "MANAGER", { ...NO_GRANTS, activity: true }),
      ).headers.get("location"),
    ).toBeNull();
  });

  it("keeps Organisations for the Super Admin", () => {
    expect(location(middleware(request("/dashboard/organisations", "ADMIN")))).toBe(
      "/dashboard/overview",
    );
    expect(
      middleware(request("/dashboard/organisations", "SUPER_ADMIN")).headers.get("location"),
    ).toBeNull();
  });
});
