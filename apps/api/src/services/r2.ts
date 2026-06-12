import { readFile } from "fs/promises";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const R2_ENV_KEYS = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_PUBLIC_URL",
] as const;

export function getR2ConfigStatus() {
  const missing = R2_ENV_KEYS.filter((key) => !process.env[key]?.trim());
  return { configured: missing.length === 0, missing };
}

export function isR2Configured(): boolean {
  return getR2ConfigStatus().configured;
}

function r2NotConfiguredError(): Error {
  const { missing } = getR2ConfigStatus();
  return new Error(
    `R2 is not fully configured. Missing on API service: ${missing.join(", ")}`,
  );
}

function getR2Client() {
  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function datedPngKey(prefix: string, date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${prefix}/${y}/${m}/${prefix === "cursor-reports" ? "cursor" : "report"}-${y}-${m}-${d}.png`;
}

function reportKey(date: Date) {
  return datedPngKey("reports", date);
}

function cursorReportKey(date: Date) {
  return datedPngKey("cursor-reports", date);
}

export async function uploadScreenshotToR2(opts: {
  date: Date;
  base64?: string;
  filePath?: string;
}): Promise<string> {
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME?.trim();
  const publicBase = process.env.R2_PUBLIC_URL?.trim();

  if (!client || !bucket || !publicBase) {
    throw r2NotConfiguredError();
  }

  let body: Buffer;
  if (opts.base64) {
    body = Buffer.from(opts.base64, "base64");
  } else if (opts.filePath) {
    body = await readFile(opts.filePath);
  } else {
    throw new Error("Either base64 or filePath is required");
  }

  const key = reportKey(opts.date);
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: "image/png",
    })
  );

  return `${publicBase.replace(/\/$/, "")}/${key}`;
}

export async function uploadCursorScreenshotToR2(opts: {
  date?: Date;
  base64?: string;
  filePath?: string;
}): Promise<string> {
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME?.trim();
  const publicBase = process.env.R2_PUBLIC_URL?.trim();

  if (!client || !bucket || !publicBase) {
    throw r2NotConfiguredError();
  }

  let body: Buffer;
  if (opts.base64) {
    body = Buffer.from(opts.base64, "base64");
  } else if (opts.filePath) {
    body = await readFile(opts.filePath);
  } else {
    throw new Error("Either base64 or filePath is required");
  }

  const date = opts.date ?? new Date();
  const key = cursorReportKey(date);
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: "image/png",
    }),
  );

  return `${publicBase.replace(/\/$/, "")}/${key}`;
}
