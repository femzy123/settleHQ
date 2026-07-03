import { describe, expect, it } from "vitest";

import {
  generateNombaWebhookSignature,
  getNombaWebhookSignaturePayload,
  verifyNombaWebhookSignature,
} from "./nomba-webhook";

const payload = {
  event_type: "payment_success",
  requestId: "45f2dc2d-d559-4773-bba3-2d5ec17b2e20",
  data: {
    merchant: {
      walletId: "6756ff80aafe04a795f18b38",
      walletBalance: 6052,
      userId: "b7b10e81-e57d-41d0-8fdc-f4e23a132bbf",
    },
    terminal: {},
    transaction: {
      aliasAccountNumber: "5343270516",
      fee: 5,
      sessionId: "IFAP-TRANSFER-46501-e0339485-1a2f-4b43-9bd5-fec9649e5928",
      type: "vact_transfer",
      transactionId: "API-VACT_TRA-B7B10-0435b274-807a-4bc7-8abe-9dbb4548fd7a",
      aliasAccountName: "SAMPLE/JOHN DOE",
      responseCode: "",
      originatingFrom: "api",
      transactionAmount: 10,
      narration: "John Doe Transfer 10.00 To SAMPLE/JOHN DOE - Nomba",
      time: "2025-09-29T10:51:44Z",
      aliasAccountReference: "654f7c80bd4a510c90fb7f92",
      aliasAccountType: "VIRTUAL",
    },
    customer: {
      bankCode: "090645",
      senderName: "John Doe",
      bankName: "Nombank",
      accountNumber: "0000000000",
    },
  },
};

describe("nomba webhook helpers", () => {
  it("builds the documented HMAC payload", () => {
    expect(
      getNombaWebhookSignaturePayload(payload, "2025-09-29T10:51:44Z"),
    ).toBe(
      "payment_success:45f2dc2d-d559-4773-bba3-2d5ec17b2e20:b7b10e81-e57d-41d0-8fdc-f4e23a132bbf:6756ff80aafe04a795f18b38:API-VACT_TRA-B7B10-0435b274-807a-4bc7-8abe-9dbb4548fd7a:vact_transfer:2025-09-29T10:51:44Z::2025-09-29T10:51:44Z",
    );
  });

  it("supports request_id as a fallback request identifier", () => {
    const snakeCasePayload = {
      ...payload,
      requestId: undefined,
      request_id: "snake-case-request-id",
    };

    expect(
      getNombaWebhookSignaturePayload(snakeCasePayload, "2025-09-29T10:51:44Z"),
    ).toContain("payment_success:snake-case-request-id:");
  });

  it("treats string null response codes as empty values", () => {
    const nullResponseCodePayload = {
      ...payload,
      data: {
        ...payload.data,
        transaction: {
          ...payload.data.transaction,
          responseCode: "null",
        },
      },
    };

    expect(
      getNombaWebhookSignaturePayload(
        nullResponseCodePayload,
        "2025-09-29T10:51:44Z",
      ),
    ).toContain("Z::2025-09-29T10:51:44Z");
  });

  it("verifies a valid Nomba webhook signature", () => {
    const timestamp = "2025-09-29T10:51:44Z";
    const secret = "NombaHackathon2026";
    const signature = generateNombaWebhookSignature(payload, secret, timestamp);

    expect(
      verifyNombaWebhookSignature({
        payload,
        secret,
        headers: {
          signature,
          timestamp,
          algorithm: "HmacSHA256",
        },
      }),
    ).toEqual({ ok: true, reason: null });
  });

  it("rejects invalid Nomba webhook signatures", () => {
    expect(
      verifyNombaWebhookSignature({
        payload,
        secret: "NombaHackathon2026",
        headers: {
          signature: "invalid",
          timestamp: "2025-09-29T10:51:44Z",
          algorithm: "HmacSHA256",
        },
      }).ok,
    ).toBe(false);
  });
});
