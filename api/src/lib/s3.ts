import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../env.js';

const PRESIGN_TTL_SECONDS = 60 * 60 * 24;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

let client: S3Client | null = null;

export function isS3Configured() {
  return Boolean(env.s3Endpoint && env.s3AccessKeyId && env.s3SecretAccessKey && env.s3Bucket);
}

export function maxUploadBytes() {
  return MAX_UPLOAD_BYTES;
}

function s3() {
  if (!isS3Configured()) {
    throw new Error('Object storage is not configured');
  }
  if (!client) {
    client = new S3Client({
      region: env.s3Region || 'auto',
      endpoint: env.s3Endpoint,
      credentials: {
        accessKeyId: env.s3AccessKeyId,
        secretAccessKey: env.s3SecretAccessKey,
      },
      forcePathStyle: false,
    });
  }
  return client;
}

export function chatObjectKey(clerkId: string, threadId: string, ext: string) {
  return `chat/${clerkId}/${threadId}/${crypto.randomUUID()}.${ext}`;
}

export function isOwnedChatKey(key: string, clerkId: string) {
  return key.startsWith(`chat/${clerkId}/`) && !key.includes('..');
}

export async function putChatImage(opts: {
  key: string;
  body: Buffer;
  contentType: string;
}) {
  await s3().send(new PutObjectCommand({
    Bucket: env.s3Bucket,
    Key: opts.key,
    Body: opts.body,
    ContentType: opts.contentType,
  }));
}

export async function presignGet(key: string) {
  return getSignedUrl(
    s3(),
    new GetObjectCommand({
      Bucket: env.s3Bucket,
      Key: key,
    }),
    { expiresIn: PRESIGN_TTL_SECONDS },
  );
}

export type StoredImage = {
  key?: string;
  url?: string;
  name?: string;
  size?: number;
  type?: string;
  base64?: string;
  _wasStripped?: boolean;
};

export function stripVolatileImageFields(image: StoredImage | undefined): StoredImage | undefined {
  if (!image) return undefined;
  return {
    ...(image.key ? { key: image.key } : {}),
    ...(image.url ? { url: image.url } : {}),
    ...(image.name ? { name: image.name } : {}),
    ...(image.size !== undefined ? { size: image.size } : {}),
    ...(image.type ? { type: image.type } : {}),
    ...(image._wasStripped ? { _wasStripped: true } : {}),
  };
}

export async function hydrateStoredImage(image: StoredImage | undefined, clerkId: string): Promise<StoredImage | undefined> {
  if (!image) return undefined;
  const cleaned = stripVolatileImageFields(image);
  if (!cleaned?.key) {
    if (cleaned?.url?.startsWith('data:') || cleaned?.url === '[Image removed to save storage]') {
      return { ...cleaned, url: '', _wasStripped: true };
    }
    return cleaned;
  }
  if (!isOwnedChatKey(cleaned.key, clerkId) || !isS3Configured()) {
    return { ...cleaned, url: '', _wasStripped: true };
  }
  return {
    key: cleaned.key,
    name: cleaned.name,
    size: cleaned.size,
    type: cleaned.type,
    url: await presignGet(cleaned.key),
  };
}
