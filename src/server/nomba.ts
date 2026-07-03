import { runtimeEnv } from "@/lib/env";
import {
  buildCheckoutOrderPayload,
  getCheckoutLinkFromResponse,
  type BuildCheckoutOrderInput,
} from "@/lib/nomba-checkout";

export class NombaApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly response?: unknown,
  ) {
    super(message);
    this.name = "NombaApiError";
  }
}

type TokenCache = {
  accessToken: string;
  expiresAt: number;
};

let tokenCache: TokenCache | null = null;

function getRequiredNombaConfig() {
  const {
    nombaBaseUrl,
    nombaParentAccountId,
    nombaActiveClientId,
    nombaActivePrivateKey,
    nombaHackathonSubAccountId,
  } = runtimeEnv;

  if (!nombaParentAccountId) {
    throw new NombaApiError("NOMBA_PARENT_ACCOUNT_ID is not configured.");
  }

  if (!nombaActiveClientId || !nombaActivePrivateKey) {
    throw new NombaApiError("Active Nomba credentials are not configured.");
  }

  if (!nombaHackathonSubAccountId) {
    throw new NombaApiError(
      "NOMBA_HACKATHON_SUB_ACCOUNT_ID is not configured.",
    );
  }

  return {
    baseUrl: nombaBaseUrl.replace(/\/$/, ""),
    parentAccountId: nombaParentAccountId,
    clientId: nombaActiveClientId,
    privateKey: nombaActivePrivateKey,
    subAccountId: nombaHackathonSubAccountId,
  };
}

function getAccessTokenFromResponse(response: unknown) {
  if (!response || typeof response !== "object") {
    return null;
  }

  const body = response as {
    access_token?: unknown;
    accessToken?: unknown;
    expires_in?: unknown;
    expiresIn?: unknown;
    data?: {
      access_token?: unknown;
      accessToken?: unknown;
      expires_in?: unknown;
      expiresIn?: unknown;
    };
  };
  const accessToken =
    body.data?.access_token ??
    body.data?.accessToken ??
    body.access_token ??
    body.accessToken;

  if (typeof accessToken !== "string" || accessToken.length === 0) {
    return null;
  }

  const expiresIn =
    body.data?.expires_in ??
    body.data?.expiresIn ??
    body.expires_in ??
    body.expiresIn;

  return {
    accessToken,
    expiresIn: typeof expiresIn === "number" ? expiresIn : 30 * 60,
  };
}

async function parseResponse(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function getNombaAccessToken() {
  const now = Date.now();

  if (tokenCache && tokenCache.expiresAt > now + 60_000) {
    return tokenCache.accessToken;
  }

  const config = getRequiredNombaConfig();
  const response = await fetch(
    `${config.baseUrl}/auth/token/issue`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accountId: config.parentAccountId,
      },
      body: JSON.stringify({
        grant_type: "client_credentials",
        client_id: config.clientId,
        client_secret: config.privateKey,
      }),
    },
  );
  const body = await parseResponse(response);

  if (!response.ok) {
    throw new NombaApiError(
      "Nomba authentication failed.",
      response.status,
      body,
    );
  }

  const token = getAccessTokenFromResponse(body);

  if (!token) {
    throw new NombaApiError(
      "Nomba authentication response did not include an access token.",
      response.status,
      body,
    );
  }

  tokenCache = {
    accessToken: token.accessToken,
    expiresAt: now + token.expiresIn * 1000,
  };

  return token.accessToken;
}

export type CreateNombaCheckoutOrderInput = Omit<
  BuildCheckoutOrderInput,
  "accountId"
>;

export async function createNombaCheckoutOrder(
  input: CreateNombaCheckoutOrderInput,
) {
  const config = getRequiredNombaConfig();
  const accessToken = await getNombaAccessToken();
  const payload = buildCheckoutOrderPayload({
    ...input,
    accountId: config.subAccountId,
  });

  const response = await fetch(`${config.baseUrl}/checkout/order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      accountId: config.parentAccountId,
    },
    body: JSON.stringify(payload),
  });
  const body = await parseResponse(response);

  if (!response.ok) {
    throw new NombaApiError(
      "Nomba checkout order creation failed.",
      response.status,
      body,
    );
  }

  const checkout = getCheckoutLinkFromResponse(body);

  if (!checkout) {
    throw new NombaApiError(
      "Nomba checkout response did not include a checkout link.",
      response.status,
      body,
    );
  }

  return {
    checkoutLink: checkout.checkoutLink,
    orderReference: checkout.orderReference ?? input.orderReference,
    rawResponse: body,
  };
}
