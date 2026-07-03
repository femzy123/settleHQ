import { describe, expect, it } from "vitest";

import { parseNairaToKobo, validateCollectionInput } from "./collections";

describe("parseNairaToKobo", () => {
  it("converts NGN input to kobo", () => {
    expect(parseNairaToKobo("150000")).toBe(15_000_000);
    expect(parseNairaToKobo("1,500.50")).toBe(150_050);
  });
});

describe("validateCollectionInput", () => {
  it("rejects empty names", () => {
    expect(
      validateCollectionInput({
        name: " ",
        amount: "1000",
        dueDate: "2026-08-01",
        payerIds: [1],
      }),
    ).toEqual({
      ok: false,
      errors: { name: "Enter a collection name." },
    });
  });

  it("rejects invalid, zero, and negative amounts", () => {
    for (const amount of ["abc", "0", "-100"]) {
      expect(
        validateCollectionInput({
          name: "Term fees",
          amount,
          dueDate: "2026-08-01",
          payerIds: [1],
        }),
      ).toEqual({
        ok: false,
        errors: { amount: "Enter a valid amount greater than zero." },
      });
    }
  });

  it("rejects invalid due dates", () => {
    expect(
      validateCollectionInput({
        name: "Term fees",
        amount: "1000",
        dueDate: "2026-99-01",
        payerIds: [1],
      }),
    ).toEqual({
      ok: false,
      errors: { dueDate: "Enter a valid due date." },
    });
  });

  it("rejects empty payer selection", () => {
    expect(
      validateCollectionInput({
        name: "Term fees",
        amount: "1000",
        dueDate: "2026-08-01",
        payerIds: [],
      }),
    ).toEqual({
      ok: false,
      errors: { payerIds: "Select at least one payer." },
    });
  });

  it("normalizes a valid collection", () => {
    expect(
      validateCollectionInput({
        name: "  Term fees  ",
        description: "  Second term  ",
        amount: "150,000.50",
        dueDate: "2026-08-01",
        payerIds: ["2", "2", "3"],
      }),
    ).toEqual({
      ok: true,
      data: {
        name: "Term fees",
        description: "Second term",
        amountKobo: 15_000_050,
        dueDate: "2026-08-01",
        payerIds: [2, 3],
      },
    });
  });
});
