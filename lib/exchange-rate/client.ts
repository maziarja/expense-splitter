import { z } from "zod";
import { SUPPORTED_CURRENCIES, type CurrencyCode } from "../splits/constants";

export type ExchangeRateApiErrorCode =
  | "invalid-key"
  | "inactive-account"
  | "quota-reached"
  | "unsupported-code"
  | "malformed-request"
  | "invalid-json"
  | "network-error"
  | "invalid-response";

export class ExchangeRateApiError extends Error {
  constructor(
    message: string,
    public readonly code: ExchangeRateApiErrorCode,
  ) {
    super(message);
    this.name = "ExchangeRateApiError";
  }
}

export type ExchangeRateSnapshot = {
  base: CurrencyCode;
  rates: Record<CurrencyCode, number>;
  fetchedAt: Date;
};

const successResponseSchema = z.object({
  result: z.literal("success"),
  base_code: z.string(),
  time_last_update_unix: z.number(),
  conversion_rates: z.record(z.string(), z.number()),
});

const errorResponseSchema = z.object({
  result: z.literal("error"),
  "error-type": z.string(),
});

// GET /latest/{base} returns conversion rates to every currency the API
// supports in one call, so fetching once per base currency is enough to
// populate ExchangeRateCache rows for all of SUPPORTED_CURRENCIES — cheaper
// than a /pair call per quote currency (see tech-stack.md's "generous free
// tier" reasoning).
export async function fetchLatestRates(
  base: CurrencyCode,
): Promise<ExchangeRateSnapshot> {
  const apiKey = process.env.CURRENCY_API_KEY;
  const baseUrl = process.env.CURRENCY_API_BASE_URL;
  if (!apiKey || !baseUrl) {
    throw new ExchangeRateApiError(
      "CURRENCY_API_KEY or CURRENCY_API_BASE_URL is not configured",
      "invalid-response",
    );
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/${apiKey}/latest/${base}`);
  } catch {
    throw new ExchangeRateApiError(
      "Failed to reach ExchangeRate-API",
      "network-error",
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ExchangeRateApiError(
      "ExchangeRate-API returned a non-JSON response",
      "invalid-response",
    );
  }

  const errorParse = errorResponseSchema.safeParse(body);
  if (errorParse.success) {
    const code = errorParse.data["error-type"];
    throw new ExchangeRateApiError(
      `ExchangeRate-API error: ${code}`,
      isKnownErrorType(code) ? code : "invalid-response",
    );
  }

  const successParse = successResponseSchema.safeParse(body);
  if (!successParse.success) {
    throw new ExchangeRateApiError(
      "ExchangeRate-API returned an unexpected response shape",
      "invalid-response",
    );
  }

  const { conversion_rates, time_last_update_unix } = successParse.data;
  const rates = {} as Record<CurrencyCode, number>;
  for (const currency of SUPPORTED_CURRENCIES) {
    const rate = conversion_rates[currency];
    if (rate === undefined) {
      throw new ExchangeRateApiError(
        `ExchangeRate-API response is missing a rate for ${currency}`,
        "invalid-response",
      );
    }
    rates[currency] = rate;
  }

  return {
    base,
    rates,
    fetchedAt: new Date(time_last_update_unix * 1000),
  };
}

const KNOWN_ERROR_TYPES: ReadonlySet<string> = new Set([
  "invalid-key",
  "inactive-account",
  "quota-reached",
  "unsupported-code",
  "malformed-request",
  "invalid-json",
]);

function isKnownErrorType(
  code: string,
): code is Exclude<
  ExchangeRateApiErrorCode,
  "network-error" | "invalid-response"
> {
  return KNOWN_ERROR_TYPES.has(code);
}
