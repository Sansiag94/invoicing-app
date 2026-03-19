import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AccountDeletionError,
  deleteUserAccount,
  isAccountDeletionError,
} from "@/lib/accountDeletion";

describe("deleteUserAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks self-serve deletion until a retention-safe archival flow exists", async () => {
    try {
      await deleteUserAccount("user-123");
      throw new Error("Expected deleteUserAccount to fail");
    } catch (error) {
      expect(isAccountDeletionError(error)).toBe(true);
      expect(error).toBeInstanceOf(AccountDeletionError);
      expect((error as AccountDeletionError).status).toBe(409);
      expect((error as AccountDeletionError).message).toBe(
        "Self-service account deletion is unavailable because invoice and accounting records may need to be retained. Export your records and close the workspace through an administrator-supported process instead."
      );
    }
  });
});
