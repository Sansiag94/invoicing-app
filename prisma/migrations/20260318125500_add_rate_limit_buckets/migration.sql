CREATE TABLE "RateLimitBucket" (
    "uuid" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("uuid")
);

CREATE UNIQUE INDEX "RateLimitBucket_route_identifier_windowStart_key"
ON "RateLimitBucket"("route", "identifier", "windowStart");

CREATE INDEX "RateLimitBucket_expiresAt_idx"
ON "RateLimitBucket"("expiresAt");

