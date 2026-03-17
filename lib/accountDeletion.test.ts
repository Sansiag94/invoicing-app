import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, supabaseAdminMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      deleteMany: vi.fn(),
    },
  },
  supabaseAdminMock: {
    auth: {
      admin: {
        deleteUser: vi.fn(),
      },
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}));

vi.mock("@/lib/supabase-admin", () => ({
  getSupabaseAdminClient: () => supabaseAdminMock,
}));

import {
  AccountDeletionError,
  deleteUserAccount,
  isAccountDeletionError,
} from "@/lib/accountDeletion";

describe("deleteUserAccount", () => {
  beforeEach(() => {
    prismaMock.user.deleteMany.mockReset();
    supabaseAdminMock.auth.admin.deleteUser.mockReset();
  });

  it("deletes auth first and then removes local data", async () => {
    supabaseAdminMock.auth.admin.deleteUser.mockResolvedValue({ error: null });
    prismaMock.user.deleteMany.mockResolvedValue({ count: 1 });

    await deleteUserAccount("user-123");

    expect(supabaseAdminMock.auth.admin.deleteUser).toHaveBeenCalledWith("user-123");
    expect(prismaMock.user.deleteMany).toHaveBeenCalledWith({
      where: { id: "user-123" },
    });
  });

  it("keeps local data intact when auth deletion fails", async () => {
    supabaseAdminMock.auth.admin.deleteUser.mockResolvedValue({
      error: new Error("boom"),
    });

    try {
      await deleteUserAccount("user-123");
      throw new Error("Expected deleteUserAccount to fail");
    } catch (error) {
      expect(isAccountDeletionError(error)).toBe(true);
      expect(error).toBeInstanceOf(AccountDeletionError);
      expect((error as AccountDeletionError).status).toBe(502);
      expect((error as AccountDeletionError).message).toBe(
        "Could not delete the authentication account. Please try again."
      );
    }

    expect(prismaMock.user.deleteMany).not.toHaveBeenCalled();
  });
});
