import { describe, expect, it } from "vitest";

import { safeAccountName } from "./virtual-accounts";

describe("safeAccountName", () => {
  it("removes special characters Nomba rejects", () => {
    expect(safeAccountName("Aina Obembe", "James Bond")).toBe(
      "Aina Obembe James Bond",
    );
    expect(safeAccountName("Aina Obembe", "James-Bond / 007")).toBe(
      "Aina Obembe James Bond 007",
    );
  });

  it("keeps the account name within Nomba length limits", () => {
    const name = safeAccountName(
      "A very long organization name that should be cut down",
      "A very long payer name that should not exceed the maximum",
    );

    expect(name.length).toBeLessThanOrEqual(64);
    expect(name.length).toBeGreaterThanOrEqual(8);
  });
});