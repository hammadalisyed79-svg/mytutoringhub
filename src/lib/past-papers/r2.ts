import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { SIGNED_GET_TTL_SECONDS } from "./constants";

function envFirst(...names: string[]) {
  for (const name of names) {
    const value = (process.env[name] || "").trim();
    if (value) return value;
  }
  return "";
}

export function r2Endpoint() {
  const explicit = envFirst("R2_ENDPOINT", "S3_ENDPOINT_URL").replace(/\/$/, "");
  if (explicit) return explicit;
  const account = envFirst("R2_ACCOUNT_ID");
  if (account) return `https://${account}.r2.cloudflarestorage.com`;
  return "";
}

export function r2Bucket() {
  return envFirst("R2_BUCKET", "S3_BUCKET");
}

export function isR2Configured() {
  return Boolean(
    r2Endpoint() &&
      envFirst("R2_ACCESS_KEY_ID", "S3_ACCESS_KEY_ID") &&
      envFirst("R2_SECRET_ACCESS_KEY", "S3_SECRET_ACCESS_KEY") &&
      r2Bucket(),
  );
}

export function r2NotConfiguredMessage() {
  return "Cloudflare R2 is not configured. Add R2_ACCOUNT_ID or R2_ENDPOINT, plus R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET on the server. Never use NEXT_PUBLIC_ for these values.";
}

function r2Client() {
  if (!isR2Configured()) throw new Error(r2NotConfiguredMessage());
  return new S3Client({
    region: envFirst("R2_REGION", "S3_REGION") || "auto",
    endpoint: r2Endpoint(),
    credentials: {
      accessKeyId: envFirst("R2_ACCESS_KEY_ID", "S3_ACCESS_KEY_ID"),
      secretAccessKey: envFirst("R2_SECRET_ACCESS_KEY", "S3_SECRET_ACCESS_KEY"),
    },
  });
}

function safeFilename(key: string) {
  const name = key.replace(/\\/g, "/").split("/").pop() || "paper.pdf";
  return name.replace(/["\r\n]/g, "");
}

export async function headObject(key: string) {
  const res = await r2Client().send(new HeadObjectCommand({ Bucket: r2Bucket(), Key: key }));
  return {
    key,
    size: Number(res.ContentLength || 0),
    contentType: res.ContentType || null,
    etag: res.ETag || null,
  };
}

export async function getSignedGetUrl(key: string, ttlSeconds = SIGNED_GET_TTL_SECONDS) {
  const command = new GetObjectCommand({
    Bucket: r2Bucket(),
    Key: key,
    ResponseContentType: "application/pdf",
    ResponseContentDisposition: `attachment; filename="${safeFilename(key)}"`,
  });
  return getSignedUrl(r2Client(), command, { expiresIn: Math.max(15, Math.min(ttlSeconds, 300)) });
}

export async function streamGet(key: string) {
  return r2Client().send(new GetObjectCommand({ Bucket: r2Bucket(), Key: key }));
}

export async function getObjectUtf8(key: string, maxBytes = 8_000_000) {
  const res = await streamGet(key);
  const bytes = await res.Body?.transformToByteArray();
  if (!bytes) throw new Error(`Empty R2 object: ${key}`);
  if (bytes.byteLength > maxBytes) throw new Error(`R2 JSON object exceeds ${maxBytes} bytes`);
  return new TextDecoder("utf-8").decode(bytes);
}

export async function listObjectSummaries(prefix: string, maxKeys = 5000) {
  const client = r2Client();
  const out: { key: string; size: number }[] = [];
  let token: string | undefined;
  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: r2Bucket(),
        Prefix: prefix,
        ContinuationToken: token,
        MaxKeys: 1000,
      }),
    );
    for (const obj of res.Contents || []) {
      if (!obj.Key) continue;
      out.push({ key: obj.Key, size: Number(obj.Size || 0) });
      if (out.length >= maxKeys) return out;
    }
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return out;
}
