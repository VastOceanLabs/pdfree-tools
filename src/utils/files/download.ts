// src/utils/files/download.ts
// Centralized, reliable client-side downloads for Blobs & URLs.

import { saveAs } from 'file-saver';

/**
 * Normalizes a filename: trims, strips path separators, and falls back if empty.
 */
function sanitizeFilename(name: string | undefined | null, fallback = 'download'): string {
  const cleaned = (name ?? '').toString().trim().replace(/[\\/:*?"<>|]+/g, '');
  return cleaned || fallback;
}

/**
 * Download a Blob with a given filename.
 * Uses file-saver under the hood and revokes any temporary object URLs we create.
 */
export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  // Guard for SSR or non-browser environments
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const safeName = sanitizeFilename(filename, 'file');

  // file-saver’s saveAs already handles most browser quirks (Safari, Chrome, Edge).
  // We still ensure a sensible default type to hint the OS when Blob has no type.
  const typedBlob = blob.type ? blob : new Blob([blob], { type: 'application/octet-stream' });

  saveAs(typedBlob, safeName);
}

/**
 * Convenience helper: fetch a URL (same-origin or CORS-allowed) and download it as a file.
 * Useful when a tool returns a URL string but you want consistent downloads.
 */
export async function downloadFromUrl(url: string, filename?: string): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const res = await fetch(url, { credentials: 'omit' });
  if (!res.ok) throw new Error(`Failed to fetch file: ${res.status} ${res.statusText}`);

  const blob = await res.blob();

  // Try to infer a name if none provided (from Content-Disposition or the URL path)
  let inferred = filename;
  if (!inferred) {
    const cd = res.headers.get('Content-Disposition') || '';
    const match = /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i.exec(cd);
    inferred = match?.[1] ?? url.split('?')[0].split('/').pop();
  }

  await downloadBlob(blob, sanitizeFilename(inferred, 'file'));
}

/**
 * Create & download a temporary object URL for data that isn't already a Blob.
 * Returns a cleanup function in case you want to manage lifecycle yourself.
 */
export function downloadObjectUrl(data: Blob | ArrayBuffer | Uint8Array, filename: string): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};

  const blob = data instanceof Blob ? data : new Blob([data], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);

  // Use an <a> click for slightly faster start; fall back to file-saver if needed.
  const link = document.createElement('a');
  link.href = url;
  link.download = sanitizeFilename(filename, 'file');
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  const cleanup = () => URL.revokeObjectURL(url);
  // Revoke on next tick to avoid interrupting the navigation.
  setTimeout(cleanup, 0);
  return cleanup;
}

export default downloadBlob;
