"use client";

import { hex } from "@/styles/tokens";

/**
 * The root layout itself crashed (U-3). Nothing of the app can be trusted to render here, the
 * stylesheet included, so this page carries its own few styles, from the same tokens.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: hex.panel,
          color: hex.primary,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <main role="alert" style={{ maxWidth: 360, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 18, margin: 0 }}>Something went wrong</h1>
          <p style={{ color: hex.quiet, fontSize: 14 }}>Something went wrong. Try again.</p>
          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: 44,
              padding: "0 20px",
              borderRadius: 10,
              border: 0,
              background: hex.brand,
              color: hex["on-brand"],
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
