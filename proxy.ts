import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSecurityHeaders } from "@/lib/securityHeaders";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const securityHeaders = getSecurityHeaders(request.nextUrl.pathname);

  for (const [header, value] of Object.entries(securityHeaders)) {
    if (
      header === "Strict-Transport-Security" &&
      (request.nextUrl.protocol !== "https:" || request.nextUrl.hostname === "localhost")
    ) {
      continue;
    }

    response.headers.set(header, value);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
