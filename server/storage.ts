// Preconfigured storage helpers for Manus WebDev templates
// Uses the Biz-provided storage proxy (Authorization: Bearer <token>)

import { ENV } from './_core/env';

type StorageConfig = { baseUrl: string; apiKey: string };

function getStorageConfig(): StorageConfig | null {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;

  if (!baseUrl || !apiKey) {
    console.warn("[Storage] Forge API credentials missing, using local filesystem fallback.");
    return null;
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

import fs from 'fs';
import path from 'path';

function getLocalUploadsDir() {
  const dir = path.resolve(process.cwd(), 'uploads');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function buildUploadUrl(baseUrl: string, relKey: string): URL {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}

async function buildDownloadUrl(
  baseUrl: string,
  relKey: string,
  apiKey: string
): Promise<string> {
  const downloadApiUrl = new URL(
    "v1/storage/downloadUrl",
    ensureTrailingSlash(baseUrl)
  );
  downloadApiUrl.searchParams.set("path", normalizeKey(relKey));
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: buildAuthHeaders(apiKey),
  });
  return (await response.json()).url;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function toFormData(
  data: Buffer | Uint8Array | string,
  contentType: string,
  fileName: string
): FormData {
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const config = getStorageConfig();
  const key = normalizeKey(relKey);
  
  if (!config) {
    // Fallback: Local filesystem
    const uploadsDir = getLocalUploadsDir();
    const safeKey = key.replace(/[^a-zA-Z0-9._/-]/g, '_');
    const filePath = path.resolve(uploadsDir, safeKey.split('/').pop() || safeKey);
    
    let bufferData: Buffer;
    if (typeof data === 'string') {
      bufferData = Buffer.from(data, 'utf-8');
    } else if (Buffer.isBuffer(data)) {
      bufferData = data;
    } else if (data instanceof Uint8Array) {
      bufferData = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
    } else {
      bufferData = data as Buffer;
    }
    
    fs.writeFileSync(filePath, bufferData);
    // Return a dummy url or a local express static route prefix
    return { key, url: `/uploads/${path.basename(filePath)}` };
  }

  const uploadUrl = buildUploadUrl(config.baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(config.apiKey),
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const url = (await response.json()).url;
  return { key, url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string; }> {
  const config = getStorageConfig();
  const key = normalizeKey(relKey);
  
  if (!config) {
    // Fallback: Local filesystem
    const uploadsDir = getLocalUploadsDir();
    const safeKey = key.replace(/[^a-zA-Z0-9._/-]/g, '_');
    const filePath = path.resolve(uploadsDir, safeKey.split('/').pop() || safeKey);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    return {
      key,
      url: `/uploads/${path.basename(filePath)}`
    };
  }
  
  return {
    key,
    url: await buildDownloadUrl(config.baseUrl, key, config.apiKey),
  };
}
