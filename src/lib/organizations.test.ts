import { describe, expect, it } from "vitest";

import {
  getOrganizationTypeLabel,
  validateOrganizationInput,
} from "./organizations";

describe("validateOrganizationInput", () => {
  it("normalizes valid organization input", () => {
    expect(
      validateOrganizationInput({
        name: "  Bright Future Academy  ",
        organizationType: "school",
        email: " finance@school.test ",
        phone: " 0800000000 ",
        logoUrl: " https://school.test/logo.png ",
      }),
    ).toEqual({
      ok: true,
      data: {
        name: "Bright Future Academy",
        organizationType: "school",
        email: "finance@school.test",
        phone: "0800000000",
        logoUrl: "https://school.test/logo.png",
      },
    });
  });

  it("rejects invalid required fields and malformed optional fields", () => {
    expect(
      validateOrganizationInput({
        name: "A",
        organizationType: "bank",
        email: "bad-email",
        logoUrl: "ftp://school.test/logo.png",
      }),
    ).toEqual({
      ok: false,
      errors: {
        name: "Enter an organization name.",
        organizationType: "Choose a valid organization type.",
        email: "Enter a valid email address or leave it blank.",
        logoUrl: "Logo URL must start with http or https.",
      },
    });
  });
});

describe("getOrganizationTypeLabel", () => {
  it("returns known labels and falls back to Other", () => {
    expect(getOrganizationTypeLabel("estate")).toBe("Estate");
    expect(getOrganizationTypeLabel("unknown")).toBe("Other");
  });
});
