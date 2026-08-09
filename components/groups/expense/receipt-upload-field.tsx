"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { CameraIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];
const ACCEPTED_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".heic",
  ".heif",
];
const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

function isAcceptedImage(file: File) {
  if (ACCEPTED_TYPES.includes(file.type)) return true;
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function isHeic(file: File) {
  if (file.type === "image/heic" || file.type === "image/heif") return true;
  const name = file.name.toLowerCase();
  return name.endsWith(".heic") || name.endsWith(".heif");
}

// No browser can decode/display a HEIC file (not even Safari — it doesn't
// recognize the "image/heic" mimetype either), so an uploaded-as-is HEIC
// would upload "successfully" but never render as a thumbnail here, in
// Vercel's own Storage browser, or (later) to the AI vision extraction step,
// which only accepts JPEG/PNG/WEBP/GIF. Converting client-side to JPEG
// before upload is what makes the file actually viewable anywhere.
async function convertHeicToJpeg(file: File): Promise<File> {
  const heic2any = (await import("heic2any")).default;
  const result = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.8,
  });
  const jpegBlob = Array.isArray(result) ? result[0] : result;
  const baseName = file.name.replace(/\.(heic|heif)$/i, "");
  return new File([jpegBlob], `${baseName}.jpg`, { type: "image/jpeg" });
}

export function ReceiptUploadField({
  value,
  onChange,
  extracting = false,
  extractionError = null,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  extracting?: boolean;
  extractionError?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<"idle" | "converting" | "uploading">(
    "idle",
  );
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so choosing the same file again still fires onChange.
    event.target.value = "";
    if (!file) return;

    if (!isAcceptedImage(file)) {
      setError("Please choose a JPEG, PNG, WEBP, or HEIC/HEIF image.");
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("That image is too large — the limit is 15MB.");
      return;
    }

    setError(null);

    let uploadFile = file;
    if (isHeic(file)) {
      setStage("converting");
      try {
        uploadFile = await convertHeicToJpeg(file);
      } catch {
        setError("Couldn't process that HEIC photo — try a different one.");
        setStage("idle");
        return;
      }
    }

    setStage("uploading");
    setProgress(0);
    try {
      const blob = await upload(uploadFile.name, uploadFile, {
        access: "public",
        handleUploadUrl: "/api/receipt-upload",
        onUploadProgress: (event) => setProgress(event.percentage),
      });
      onChange(blob.url);
    } catch {
      setError("Couldn't upload that receipt — try again.");
    } finally {
      setStage("idle");
    }
  }

  return (
    <Field>
      <FieldLabel>Receipt</FieldLabel>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleFileChange}
      />
      {value ? (
        <div className="relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element -- receipts
              live at arbitrary Vercel Blob URLs; no next/image domain is
              configured anywhere else in this app either. */}
          <img
            src={value}
            alt="Uploaded receipt"
            className="h-24 w-24 rounded-lg border border-border-subtle object-cover"
          />
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setError(null);
            }}
            aria-label="Remove receipt"
            className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full border border-border-subtle bg-bg-secondary text-text-secondary hover:text-text-primary"
          >
            <XIcon className="size-3" />
          </button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={stage !== "idle"}
        >
          {stage === "converting" && (
            <>
              <Spinner />
              Converting…
            </>
          )}
          {stage === "uploading" && (
            <>
              <Spinner />
              Uploading… {progress}%
            </>
          )}
          {stage === "idle" && (
            <>
              <CameraIcon />
              Scan receipt
            </>
          )}
        </Button>
      )}
      {extracting && (
        <p className="flex items-center gap-1.5 text-xs text-text-secondary">
          <Spinner className="size-3" />
          Extracting details…
        </p>
      )}
      {extractionError && <FieldError>{extractionError}</FieldError>}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  );
}
