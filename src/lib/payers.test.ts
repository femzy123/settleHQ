import { describe, expect, it } from "vitest";

import { validatePayerInput } from "./payers";

describe("validatePayerInput", () => {
  it("rejects empty names", () => {
    expect(validatePayerInput({ fullName: " " })).toEqual({
      ok: false,
      errors: { fullName: "Enter a payer name." },
    });
  });

  it("accepts optional contact and external ID fields", () => {
    expect(
      validatePayerInput({
        fullName: "  John Doe  ",
        email: " john@example.com ",
        phone: " 0800000000 ",
        externalId: " STU-1024 ",
      }),
    ).toEqual({
      ok: true,
      data: {
        fullName: "John Doe",
        email: "john@example.com",
        phone: "0800000000",
        externalId: "STU-1024",
      },
    });
  });

  it("rejects invalid email", () => {
    expect(
      validatePayerInput({ fullName: "John Doe", email: "bad-email" }),
    ).toEqual({
      ok: false,
      errors: { email: "Enter a valid email address or leave it blank." },
    });
  });

  it("normalizes empty optional fields to null", () => {
    expect(
      validatePayerInput({
        fullName: "John Doe",
        email: " ",
        phone: "",
        externalId: " ",
      }),
    ).toEqual({
      ok: true,
      data: {
        fullName: "John Doe",
        email: null,
        phone: null,
        externalId: null,
      },
    });
  });
});
