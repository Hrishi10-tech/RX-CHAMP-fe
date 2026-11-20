import { contentSecurityPolicy, newNonce } from "./csp";

// Review S-4: the portal sends a Content-Security-Policy.
describe("contentSecurityPolicy", () => {
  const csp = contentSecurityPolicy("abc123", { socketUrl: "https://api.rxvision.shop" });

  it("lets scripts run only with the nonce, never inline or by eval", () => {
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(/script-src[^;]*'unsafe-inline'/.test(csp)).toBe(false);
  });

  it("may be framed by nobody else and loads no plugins", () => {
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
  });

  it("talks to this origin and the socket origin only", () => {
    expect(csp).toContain("connect-src 'self' https://api.rxvision.shop wss://api.rxvision.shop");
    expect(contentSecurityPolicy("n")).toContain("connect-src 'self';");
    expect(contentSecurityPolicy("n", { socketUrl: "not a url" })).toContain("connect-src 'self';");
  });

  it("development adds what the dev server needs, production never", () => {
    expect(contentSecurityPolicy("n", { dev: true })).toContain("'unsafe-eval'");
  });

  it("a nonce is fresh each time", () => {
    const a = newNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(newNonce()).not.toBe(a);
  });
});
