import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

const MAX_BYTES = 2 * 1024 * 1024;

export type StoredFile = {
  url: string;
  mimeType: string;
  size: number;
};

function provider(): string {
  return process.env.STORAGE_PROVIDER || "local";
}

export function validateUpload(mimeType: string, size: number): string | null {
  if (!ALLOWED_MIME[mimeType]) return "Only JPEG, PNG, WebP, or GIF images are allowed.";
  if (size > MAX_BYTES) return "Images must be 2MB or smaller.";
  return null;
}

export async function storeImage(input: {
  buffer: Buffer;
  mimeType: string;
  kind: "avatar" | "logo" | "cover" | "post";
}): Promise<StoredFile> {
  const invalid = validateUpload(input.mimeType, input.buffer.length);
  if (invalid) throw new Error(invalid);

  const ext = ALLOWED_MIME[input.mimeType];
  const filename = `${input.kind}-${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;

  if (provider() === "cloudinary") {
    throw new Error("Cloudinary storage is configured but not connected yet. Use STORAGE_PROVIDER=local for development.");
  }

  const uploadsDir = path.resolve(process.cwd(), "uploads", input.kind);
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, filename), input.buffer);
  return {
    url: `/uploads/${input.kind}/${filename}`,
    mimeType: input.mimeType,
    size: input.buffer.length,
  };
}

export function parseDataUrl(dataUrl: string): { mimeType: string; buffer: Buffer } | null {
  const match = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/.exec(dataUrl);
  if (!match) return null;
  return { mimeType: match[1], buffer: Buffer.from(match[2], "base64") };
}
