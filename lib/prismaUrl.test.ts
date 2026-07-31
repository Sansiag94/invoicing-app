import { buildPrismaUrl } from "@/lib/prismaUrl";

describe("buildPrismaUrl", () => {
  it("moves Supabase pooler URLs from session mode to transaction mode", () => {
    const result = buildPrismaUrl(
      "postgresql://postgres.project-ref:secret@aws-1-eu-west-1.pooler.supabase.com:5432/postgres"
    );

    expect(result).toContain("aws-1-eu-west-1.pooler.supabase.com:6543");
    expect(result).toContain("connection_limit=1");
    expect(result).toContain("pool_timeout=20");
    expect(result).toContain("pgbouncer=true");
  });

  it("keeps explicit pool settings", () => {
    const result = buildPrismaUrl(
      "postgresql://user:secret@example.com:5432/db?connection_limit=3&pool_timeout=40"
    );

    expect(result).toBe(
      "postgresql://user:secret@example.com:5432/db?connection_limit=3&pool_timeout=40"
    );
  });
});
