import { afterEach, describe, expect, it, vi } from "vitest";

async function importEnv() {
  vi.resetModules();
  return import("./env");
}

describe("runtimeEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("uses test credentials in sandbox mode", async () => {
    vi.stubEnv("NOMBA_ENV", "sandbox");
    vi.stubEnv("NOMBA_TEST_CLIENT_ID", "test-client");
    vi.stubEnv("NOMBA_TEST_PRIVATE_KEY", "test-private");
    vi.stubEnv("NOMBA_CLIENT_ID", "live-client");
    vi.stubEnv("NOMBA_PRIVATE_KEY", "live-private");

    const { runtimeEnv } = await importEnv();

    expect(runtimeEnv.nombaEnv).toBe("sandbox");
    expect(runtimeEnv.nombaActiveClientId).toBe("test-client");
    expect(runtimeEnv.nombaActivePrivateKey).toBe("test-private");
    expect(runtimeEnv.nombaBaseUrl).toBe("https://sandbox.nomba.com/v1");
  });

  it("uses live credentials in production mode", async () => {
    vi.stubEnv("NOMBA_ENV", "production");
    vi.stubEnv("NOMBA_TEST_CLIENT_ID", "test-client");
    vi.stubEnv("NOMBA_TEST_PRIVATE_KEY", "test-private");
    vi.stubEnv("NOMBA_CLIENT_ID", "live-client");
    vi.stubEnv("NOMBA_PRIVATE_KEY", "live-private");

    const { runtimeEnv } = await importEnv();

    expect(runtimeEnv.nombaEnv).toBe("production");
    expect(runtimeEnv.nombaActiveClientId).toBe("live-client");
    expect(runtimeEnv.nombaActivePrivateKey).toBe("live-private");
    expect(runtimeEnv.nombaBaseUrl).toBe("https://api.nomba.com/v1");
  });

  it("reports presence without exposing secret values", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://secret");
    vi.stubEnv("CLERK_SECRET_KEY", "sk_secret");
    vi.stubEnv("NOMBA_TEST_PRIVATE_KEY", "private_secret");
    vi.stubEnv("NOMBA_WEBHOOK_SECRET", "webhook_secret");

    const { getEnvPresence } = await importEnv();
    const presence = getEnvPresence();

    expect(presence).toMatchObject({
      DATABASE_URL: true,
      CLERK_SECRET_KEY: true,
      NOMBA_TEST_PRIVATE_KEY: true,
      NOMBA_WEBHOOK_SECRET: true,
    });
    expect(JSON.stringify(presence)).not.toContain("secret");
    expect(JSON.stringify(presence)).not.toContain("postgres://");
  });
});
