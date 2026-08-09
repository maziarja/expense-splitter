import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NoObjectGeneratedError } from "ai";
import { extractReceiptData, ReceiptExtractionError } from "./extract";

const generateText = vi.fn();

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    generateText: (...args: unknown[]) => generateText(...args),
  };
});

vi.mock("@ai-sdk/openai", () => ({
  openai: (modelId: string) => ({ modelId }),
}));

describe("extractReceiptData", () => {
  beforeEach(() => {
    vi.stubEnv("OPENAI_API_KEY", "test-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    generateText.mockReset();
  });

  it("throws a not-configured error when OPENAI_API_KEY is missing", async () => {
    vi.unstubAllEnvs();

    await expect(
      extractReceiptData("https://example.com/r.jpg"),
    ).rejects.toMatchObject({ code: "not-configured" });
    expect(generateText).not.toHaveBeenCalled();
  });

  it("returns the parsed extraction on success", async () => {
    const extraction = {
      merchant: { value: "Trader Joe's", confidence: "high" },
      amount: { value: 42.5, confidence: "high" },
      date: { value: "2026-08-07", confidence: "high" },
      currency: { value: "USD", confidence: "high" },
    };
    generateText.mockResolvedValue({ output: extraction });

    const result = await extractReceiptData("https://example.com/r.jpg");

    expect(result).toEqual(extraction);
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: { modelId: "gpt-5-mini" },
      }),
    );
  });

  it("maps NoObjectGeneratedError to an unreadable ReceiptExtractionError", async () => {
    generateText.mockRejectedValue(
      new NoObjectGeneratedError({
        message: "could not parse",
        response: { id: "1", timestamp: new Date(), modelId: "gpt-5-mini" },
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- synthetic fixture, only the error's `code` mapping is under test
        } as any,
        finishReason: "stop",
      }),
    );

    await expect(
      extractReceiptData("https://example.com/r.jpg"),
    ).rejects.toMatchObject({ code: "unreadable" });
  });

  it("maps any other thrown error to an upstream-error ReceiptExtractionError", async () => {
    generateText.mockRejectedValue(new Error("network down"));

    const rejection = extractReceiptData("https://example.com/r.jpg");
    await expect(rejection).rejects.toMatchObject({ code: "upstream-error" });
    await expect(rejection).rejects.toBeInstanceOf(ReceiptExtractionError);
  });
});
