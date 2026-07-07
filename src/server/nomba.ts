import { runtimeEnv } from "@/lib/env";
import { normalizeNombaVirtualAccountResponse } from "@/lib/nomba-virtual-account";
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


function isNombaSuccessBody(body: unknown) {
  if (!body || typeof body !== "object") {
    return false;
  }

  const payload = body as {
    code?: unknown;
    status?: unknown;
    description?: unknown;
  };

  return (
    payload.status === true ||
    payload.code === "00" ||
    String(payload.description ?? "").toUpperCase() === "SUCCESS"
  );
}
async function getNombaAccessToken() {
  const now = Date.now();

  if (tokenCache && tokenCache.expiresAt > now + 60_000) {
    return tokenCache.accessToken;
  }

  const config = getRequiredNombaConfig();
  const response = await fetch(`${config.baseUrl}/auth/token/issue`, {
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
  });
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

export async function fetchNombaCheckoutTransaction(orderReference: string) {
  const config = getRequiredNombaConfig();
  const accessToken = await getNombaAccessToken();
  const url = new URL(`${config.baseUrl}/checkout/transaction`);

  url.searchParams.set("idType", "ORDER_REFERENCE");
  url.searchParams.set("id", orderReference);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      accountId: config.parentAccountId,
    },
  });
  const body = await parseResponse(response);

  if (!response.ok) {
    throw new NombaApiError(
      "Nomba checkout transaction fetch failed.",
      response.status,
      body,
    );
  }

  return body;
}

export type CreateNombaVirtualAccountInput = {
  accountRef: string;
  accountName: string;
};

export async function createNombaVirtualAccount(
  input: CreateNombaVirtualAccountInput,
) {
  const config = getRequiredNombaConfig();
  const accessToken = await getNombaAccessToken();
  const payload = {
    accountRef: input.accountRef,
    accountName: input.accountName,
  };

  console.info("[SettleHQ Nomba] creating virtual account request", {
    endpoint: `${config.baseUrl}/accounts/virtual/[subAccountId]`,
    accountRef: payload.accountRef,
    accountName: payload.accountName,
    parentAccountHeaderPresent: Boolean(config.parentAccountId),
    subAccountIdPresent: Boolean(config.subAccountId),
  });

  const response = await fetch(
    `${config.baseUrl}/accounts/virtual/${config.subAccountId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        accountId: config.parentAccountId,
      },
      body: JSON.stringify(payload),
    },
  );
  const body = await parseResponse(response);

  console.info("[SettleHQ Nomba] create virtual account response", {
    status: response.status,
    ok: response.ok,
    accountRef: payload.accountRef,
    body,
  });

  if (!response.ok || !isNombaSuccessBody(body)) {
    throw new NombaApiError(
      "Nomba virtual account creation failed.",
      response.status,
      body,
    );
  }

  const normalized = normalizeNombaVirtualAccountResponse(
    (body && typeof body === "object" ? body : { body }) as Record<
      string,
      unknown
    >,
  );

  console.info("[SettleHQ Nomba] normalized virtual account response", {
    accountRef: normalized.accountRef,
    accountNumber: normalized.accountNumber,
    accountName: normalized.accountName,
    bankName: normalized.bankName,
    providerVirtualAccountId: normalized.providerVirtualAccountId,
  });

  return normalized;
}

export async function fetchNombaVirtualAccountTransactions(
  virtualAccountNumber: string,
) {
  const config = getRequiredNombaConfig();
  const accessToken = await getNombaAccessToken();
  const url = new URL(`${config.baseUrl}/transactions/virtual`);

  url.searchParams.set("virtual_account", virtualAccountNumber);

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      accountId: config.parentAccountId,
    },
  });
  const body = await parseResponse(response);

  if (!response.ok) {
    throw new NombaApiError(
      "Nomba virtual account transactions fetch failed.",
      response.status,
      body,
    );
  }

  return body;
}
function getFirstVirtualAccountResult(body: unknown) {
  if (!body || typeof body !== "object") {
    return null;
  }

  const payload = body as {
    data?: { results?: unknown };
  };
  const results = payload.data?.results;

  if (!Array.isArray(results) || results.length === 0) {
    return null;
  }

  const [first] = results;
  return first && typeof first === "object"
    ? (first as Record<string, unknown>)
    : null;
}

export async function findNombaVirtualAccountByRef(accountRef: string) {
  const config = getRequiredNombaConfig();
  const accessToken = await getNombaAccessToken();
  const response = await fetch(`${config.baseUrl}/accounts/virtual/list`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      accountId: config.parentAccountId,
    },
    body: JSON.stringify({ accountRef }),
  });
  const body = await parseResponse(response);

  console.info("[SettleHQ Nomba] filter virtual account response", {
    status: response.status,
    ok: response.ok,
    accountRef,
    body,
  });

  if (!response.ok || !isNombaSuccessBody(body)) {
    throw new NombaApiError(
      "Nomba virtual account lookup failed.",
      response.status,
      body,
    );
  }

  const result = getFirstVirtualAccountResult(body);

  if (!result) {
    return null;
  }

  return normalizeNombaVirtualAccountResponse(result);
}
