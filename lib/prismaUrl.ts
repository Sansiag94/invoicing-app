export function buildPrismaUrl(rawUrl: string | undefined): string | undefined {
  if (!rawUrl) {
    return undefined;
  }

  try {
    const url = new URL(rawUrl);

    // Vercel runs multiple serverless functions. Supabase's session pooler on
    // port 5432 can exhaust its small session cap quickly, so runtime traffic
    // should use Supavisor transaction pooling on port 6543.
    if (url.hostname.endsWith(".pooler.supabase.com") && url.port === "5432") {
      url.port = "6543";
    }

    // Supabase/Supavisor pooled connections can hit client caps quickly.
    // Keep Prisma's pool intentionally small to avoid max-client exhaustion.
    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", "1");
    }
    if (!url.searchParams.has("pool_timeout")) {
      url.searchParams.set("pool_timeout", "20");
    }
    if (url.hostname.endsWith(".pooler.supabase.com") && !url.searchParams.has("pgbouncer")) {
      url.searchParams.set("pgbouncer", "true");
    }

    return url.toString();
  } catch {
    return rawUrl;
  }
}
