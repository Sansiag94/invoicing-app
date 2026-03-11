import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function buildPrismaUrl(rawUrl: string | undefined): string | undefined {
  if (!rawUrl) {
    return undefined
  }

  try {
    const url = new URL(rawUrl)
    // Supabase/Supavisor pooled connections can hit client caps quickly in dev.
    // Keep Prisma's pool intentionally small to avoid max-client exhaustion.
    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", "1")
    }
    if (!url.searchParams.has("pool_timeout")) {
      url.searchParams.set("pool_timeout", "20")
    }
    return url.toString()
  } catch {
    return rawUrl
  }
}

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: buildPrismaUrl(process.env.DATABASE_URL),
      },
    },
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

export default prisma
