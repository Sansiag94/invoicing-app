import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { getAppBrandLogoUrl } from "@/lib/appBrand";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* eslint-disable @next/next/no-img-element */

function parseSize(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 512;
  }

  return Math.max(32, Math.min(1024, Math.round(parsed)));
}

function renderFallback(size: number) {
  const borderRadius = Math.round(size * 0.22);
  const innerRadius = Math.round(size * 0.16);
  const innerInset = Math.round(size * 0.12);
  const strokeWidth = Math.max(8, Math.round(size * 0.05));

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f172a",
        borderRadius,
      }}
    >
      <div
        style={{
          width: size - innerInset * 2,
          height: size - innerInset * 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#111c33",
          border: `${Math.max(4, Math.round(size * 0.02))}px solid #334155`,
          borderRadius: innerRadius,
          color: "#f8fafc",
          fontSize: Math.round(size * 0.48),
          fontWeight: 700,
          lineHeight: 1,
          fontFamily: "IBM Plex Sans, Arial, sans-serif",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            borderRadius: innerRadius,
            border: `${strokeWidth}px solid transparent`,
          }}
        >
          S
        </div>
      </div>
    </div>
  );
}

export async function GET(request: NextRequest) {
  const size = parseSize(request.nextUrl.searchParams.get("size"));
  const logoUrl = await getAppBrandLogoUrl();

  return new ImageResponse(
    logoUrl ? (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
          padding: `${Math.round(size * 0.08)}px`,
          boxSizing: "border-box",
        }}
      >
        <img
          src={logoUrl}
          alt="App logo"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
          }}
        />
      </div>
    ) : (
      renderFallback(size)
    ),
    {
      width: size,
      height: size,
    }
  );
}
