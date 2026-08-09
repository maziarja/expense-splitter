import { NextResponse } from "next/server";
import { z } from "zod";
import {
  extractReceiptData,
  ReceiptExtractionError,
} from "@/lib/receipt-extraction/extract";

const requestSchema = z.object({ imageUrl: z.url() });

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "A valid imageUrl is required" },
      { status: 400 },
    );
  }

  try {
    const extraction = await extractReceiptData(parsed.data.imageUrl);
    return NextResponse.json(extraction);
  } catch (error) {
    if (error instanceof ReceiptExtractionError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.code === "not-configured" ? 500 : 502 },
      );
    }
    return NextResponse.json(
      { error: "Failed to extract receipt data" },
      { status: 502 },
    );
  }
}
