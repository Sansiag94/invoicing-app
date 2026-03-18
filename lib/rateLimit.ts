import crypto from "crypto";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

type AssertRateLimitInput = {
  request: Request;
  route: string;
  limit: number;
  windowMs: number;
  identifier?: string;
};

type RateLimitRow = {
  count: number | bigint;
  expiresAt: Date;
};

export class RateLimitError extends Error {
  readonly retryAfterSeconds: number;
  readonly resetAt: Date;
  readonly limit: number;

  constructor(message: string, input: { retryAfterSeconds: number; resetAt: Date; limit: number }) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfterSeconds = input.retryAfterSeconds;
    this.resetAt = input.resetAt;
    this.limit = input.limit;
  }
}

export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}

export function getRequestIp(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor
      .split(",")
      .map((part) => part.trim())
      .find(Boolean);

    if (first) {
      return first;
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  return realIp || null;
}

export function buildRateLimitIdentifier(request: Request, ...parts: Array<string | null | undefined>) {
  const fingerprint = [
    getRequestIp(request) || "unknown-ip",
    request.headers.get("user-agent")?.trim() || "unknown-agent",
    ...parts.map((part) => part?.trim() || ""),
  ].join("|");

  return crypto.createHash("sha256").update(fingerprint).digest("hex");
}

function getWindowStart(now: Date, windowMs: number): Date {
  return new Date(Math.floor(now.getTime() / windowMs) * windowMs);
}

async function cleanupExpiredBuckets(now: Date) {
  try {
    await prisma.$executeRaw`
      DELETE FROM "RateLimitBucket"
      WHERE "expiresAt" < ${now}
    `;
  } catch (error) {
    console.error("[rate-limit] Failed to clean up expired buckets", error);
  }
}

export async function assertRateLimit(input: AssertRateLimitInput) {
  const now = new Date();
  const windowStart = getWindowStart(now, input.windowMs);
  const expiresAt = new Date(windowStart.getTime() + input.windowMs);
  const identifier = input.identifier?.trim() || buildRateLimitIdentifier(input.request);

  const rows = await prisma.$queryRaw<RateLimitRow[]>`
    INSERT INTO "RateLimitBucket" (
      "uuid",
      "route",
      "identifier",
      "windowStart",
      "count",
      "expiresAt",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${crypto.randomUUID()},
      ${input.route},
      ${identifier},
      ${windowStart},
      1,
      ${expiresAt},
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("route", "identifier", "windowStart")
    DO UPDATE SET
      "count" = "RateLimitBucket"."count" + 1,
      "expiresAt" = EXCLUDED."expiresAt",
      "updatedAt" = CURRENT_TIMESTAMP
    RETURNING "count", "expiresAt"
  `;

  if (Math.random() < 0.02) {
    void cleanupExpiredBuckets(now);
  }

  const count = Number(rows[0]?.count ?? 0);
  if (count <= input.limit) {
    return;
  }

  throw new RateLimitError("Too many requests. Please try again shortly.", {
    retryAfterSeconds: Math.max(1, Math.ceil((expiresAt.getTime() - now.getTime()) / 1000)),
    resetAt: expiresAt,
    limit: input.limit,
  });
}

export function createRateLimitErrorResponse(error: RateLimitError) {
  return NextResponse.json(
    {
      ok: false,
      error: error.message,
      code: "too_many_requests",
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(error.retryAfterSeconds),
        "X-RateLimit-Limit": String(error.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(error.resetAt.getTime() / 1000)),
      },
    }
  );
}
