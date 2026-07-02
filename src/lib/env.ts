type NombaEnv = "sandbox" | "production";

const nombaEnv: NombaEnv =
  process.env.NOMBA_ENV === "production" ? "production" : "sandbox";

const nombaParentAccountId =
  process.env.NOMBA_PARENT_ACCOUNT_ID ?? process.env.NOMBA_ACCOUNT_ID;

const nombaLiveClientId = process.env.NOMBA_CLIENT_ID;
const nombaLivePrivateKey = process.env.NOMBA_PRIVATE_KEY;
const nombaTestClientId = process.env.NOMBA_TEST_CLIENT_ID;
const nombaTestPrivateKey = process.env.NOMBA_TEST_PRIVATE_KEY;

const nombaActiveClientId =
  nombaEnv === "production" ? nombaLiveClientId : nombaTestClientId;

const nombaActivePrivateKey =
  nombaEnv === "production" ? nombaLivePrivateKey : nombaTestPrivateKey;

const nombaBaseUrl =
  process.env.NOMBA_BASE_URL ??
  (nombaEnv === "production"
    ? "https://api.nomba.com/v1"
    : "https://sandbox.nomba.com/v1");

export const runtimeEnv = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL,
  databaseUrl: process.env.DATABASE_URL,
  nombaEnv,
  nombaBaseUrl,
  nombaParentAccountId,
  nombaAccountId: nombaParentAccountId,
  nombaClientId: nombaLiveClientId,
  nombaPrivateKey: nombaLivePrivateKey,
  nombaTestClientId,
  nombaTestPrivateKey,
  nombaActiveClientId,
  nombaActivePrivateKey,
  nombaWebhookSecret: process.env.NOMBA_WEBHOOK_SECRET,
  nombaHackathonSubAccountId: process.env.NOMBA_HACKATHON_SUB_ACCOUNT_ID,
};

export function hasDatabaseUrl() {
  return Boolean(runtimeEnv.databaseUrl);
}

export function getEnvPresence() {
  return {
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: Boolean(
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    ),
    CLERK_SECRET_KEY: Boolean(process.env.CLERK_SECRET_KEY),
    NOMBA_ENV: nombaEnv,
    NOMBA_BASE_URL: Boolean(nombaBaseUrl),
    NOMBA_PARENT_ACCOUNT_ID: Boolean(nombaParentAccountId),
    NOMBA_ACCOUNT_ID: Boolean(process.env.NOMBA_ACCOUNT_ID),
    NOMBA_CLIENT_ID: Boolean(nombaLiveClientId),
    NOMBA_PRIVATE_KEY: Boolean(nombaLivePrivateKey),
    NOMBA_TEST_CLIENT_ID: Boolean(nombaTestClientId),
    NOMBA_TEST_PRIVATE_KEY: Boolean(nombaTestPrivateKey),
    NOMBA_ACTIVE_CLIENT_ID: Boolean(nombaActiveClientId),
    NOMBA_ACTIVE_PRIVATE_KEY: Boolean(nombaActivePrivateKey),
    NOMBA_WEBHOOK_SECRET: Boolean(process.env.NOMBA_WEBHOOK_SECRET),
    NOMBA_HACKATHON_SUB_ACCOUNT_ID: Boolean(
      process.env.NOMBA_HACKATHON_SUB_ACCOUNT_ID,
    ),
  };
}
