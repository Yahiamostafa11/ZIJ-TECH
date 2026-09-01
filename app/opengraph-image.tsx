import { ImageResponse } from "next/og";

export const alt = "ZIJ Technologies — Automate. Scale. Elevate.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 82px",
          color: "#F4EFE6",
          background:
            "radial-gradient(circle at 78% 30%, rgba(200,146,60,.28), transparent 32%), #071011",
          border: "2px solid rgba(200,146,60,.42)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ color: "#C8923C", fontSize: 76, fontWeight: 800 }}>ZIJ.</div>
          <div style={{ color: "#F2C166", fontSize: 18, letterSpacing: 8 }}>TECHNOLOGIES</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.05 }}>
            Automate. Scale. Elevate.
          </div>
          <div style={{ color: "#B8B0A5", fontSize: 28 }}>
            SaaS systems, automation, integrations, and data solutions.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
