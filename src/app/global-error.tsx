"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
  }, [error]);

  return (
    <html>
      <body
        style={{
          background: "#08090b",
          color: "#fafafa",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#ff6b1a",
            }}
          >
            Unexpected error
          </div>
          <h1 style={{ marginTop: 8, fontSize: 24, fontWeight: 700 }}>
            Something broke loading Fire-See
          </h1>
          <p style={{ marginTop: 12, color: "#a8a8a8", fontSize: 13 }}>
            Live data sources can fail intermittently. Try again — the
            dashboard will fall back to the last known good values when
            possible.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 16,
              padding: "8px 16px",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              background: "#ff6b1a",
              color: "#000",
              border: 0,
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest && (
            <div
              style={{
                marginTop: 16,
                fontSize: 10,
                color: "#7a7a7a",
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
              }}
            >
              ref · {error.digest}
            </div>
          )}
        </div>
      </body>
    </html>
  );
}
