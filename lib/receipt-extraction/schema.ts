import { z } from "zod";
import { currencyCodeSchema } from "@/lib/splits/schema";

const fieldConfidenceSchema = z.enum(["high", "low"]);

// Each field is nullable independently — a receipt might have a legible
// total but an unreadable merchant name, for example — and wrapped with a
// confidence flag rather than silently trusted, per this feature's design
// (tech-stack.md: "low-confidence fields are flagged... and surfaced in the
// UI for user confirmation").
export const receiptExtractionSchema = z.object({
  merchant: z
    .object({
      value: z
        .string()
        .describe("The merchant or business name on the receipt."),
      confidence: fieldConfidenceSchema,
    })
    .nullable()
    .describe(
      "Null only if no merchant name is legible anywhere on the receipt.",
    ),
  amount: z
    .object({
      value: z
        .number()
        .positive()
        .describe(
          "The receipt's grand total (after tax/tip), not a subtotal or a single line item.",
        ),
      confidence: fieldConfidenceSchema,
    })
    .nullable()
    .describe(
      "Null only if no total amount is legible anywhere on the receipt.",
    ),
  date: z
    .object({
      value: z.iso.date().describe("The transaction date, as YYYY-MM-DD."),
      confidence: fieldConfidenceSchema,
    })
    .nullable()
    .describe("Null only if no date is legible anywhere on the receipt."),
  currency: z
    .object({
      value: currencyCodeSchema.describe(
        "Inferred from a printed symbol/code, or from the receipt's language/country context when not explicit.",
      ),
      confidence: fieldConfidenceSchema,
    })
    .nullable()
    .describe(
      "Null only if the currency truly can't be inferred from the receipt at all.",
    ),
});

export type ReceiptExtraction = z.infer<typeof receiptExtractionSchema>;
