export const runtimeEnv = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL,
  databaseUrl: process.env.DATABASE_URL,
  nombaEnv: process.env.NOMBA_ENV ?? "sandbox",
  nombaBaseUrl:
    process.env.NOMBA_BASE_URL ?? "https://sandbox.api.nomba.com/v1",
  nombaAccountId: process.env.NOMBA_ACCOUNT_ID,
  nombaClientId: process.env.NOMBA_CLIENT_ID,
  nombaClientSecret: process.env.NOMBA_CLIENT_SECRET,
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
    NOMBA_ACCOUNT_ID: Boolean(process.env.NOMBA_ACCOUNT_ID),
    NOMBA_CLIENT_ID: Boolean(process.env.NOMBA_CLIENT_ID),
    NOMBA_CLIENT_SECRET: Boolean(process.env.NOMBA_CLIENT_SECRET),
    NOMBA_WEBHOOK_SECRET: Boolean(process.env.NOMBA_WEBHOOK_SECRET),
    NOMBA_HACKATHON_SUB_ACCOUNT_ID: Boolean(
      process.env.NOMBA_HACKATHON_SUB_ACCOUNT_ID,
    ),
  };
}
