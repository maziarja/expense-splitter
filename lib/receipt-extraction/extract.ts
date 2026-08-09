import { openai } from "@ai-sdk/openai";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { SUPPORTED_CURRENCIES } from "@/lib/splits/constants";
import { receiptExtractionSchema, type ReceiptExtraction } from "./schema";

export type ReceiptExtractionErrorCode =
  "not-configured" | "unreadable" | "upstream-error";

export class ReceiptExtractionError extends Error {
  constructor(
    message: string,
    public readonly code: ReceiptExtractionErrorCode,
  ) {
    super(message);
    this.name = "ReceiptExtractionError";
  }
}

const SYSTEM_PROMPT = `You extract structured data from a photo of a single receipt.

Rules:
- "amount" is the receipt's grand total (after tax/tip), never a subtotal or a single line item.
- Receipts may be in any language — translate merchant names only if there's no reasonable transliteration, otherwise keep the original.
- Infer "currency" from a printed symbol/code first; if none is printed, infer it from the receipt's language and any visible country/address context. It must be one of: ${SUPPORTED_CURRENCIES.join(", ")}.
- For each field, give your best guess rather than omitting it, unless the field is genuinely illegible or absent from the image entirely — only then return null for that field.
- Confidence is "high" when the value is printed clearly and unambiguously (e.g. an explicit total, an explicit currency symbol/code, a clearly printed date). Confidence is "low" when you had to infer, guess, or read something handwritten, blurry, ambiguous, or partially obscured (e.g. currency inferred only from country context, a date that could be read two ways, a smudged total). Most values on a clear, well-lit receipt photo should be "high" — reserve "low" for genuine uncertainty, not as a default hedge.`;

// The receipt image is a public Vercel Blob URL (step 1) — pointing the
// vision model straight at it, rather than fetching/re-encoding the bytes
// ourselves, since OpenAI can already fetch a public URL directly.
export async function extractReceiptData(
  imageUrl: string,
): Promise<ReceiptExtraction> {
  if (!process.env.OPENAI_API_KEY) {
    throw new ReceiptExtractionError(
      "OPENAI_API_KEY is not configured",
      "not-configured",
    );
  }

  try {
    const result = await generateText({
      model: openai("gpt-5-nano"),
      system: SYSTEM_PROMPT,
      output: Output.object({ schema: receiptExtractionSchema }),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Extract this receipt's details." },
            {
              type: "file",
              mediaType: "image",
              data: new URL(imageUrl),
            },
          ],
        },
      ],
    });

    return result.output;
  } catch (error) {
    if (NoObjectGeneratedError.isInstance(error)) {
      throw new ReceiptExtractionError(
        "The model couldn't read that receipt clearly",
        "unreadable",
      );
    }
    throw new ReceiptExtractionError(
      "Failed to reach the receipt extraction service",
      "upstream-error",
    );
  }
}
