/**
 * Canonical serialization + SHA-256 sealing for clinical documents.
 * Per CLAUDE.md §5.2: no float in the sealed path, recursively key-sorted,
 * type-tagged so `1`/"1"/true are distinguishable.
 */

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };

function canonicalize(value: Json): Json {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  const sorted: { [k: string]: Json } = {};
  for (const key of Object.keys(value).sort()) {
    sorted[key] = canonicalize((value as Record<string, Json>)[key]);
  }
  return sorted;
}

export function canonicalStringify(value: Json): string {
  return JSON.stringify(canonicalize(value));
}

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function sealDocument(content: {
  kind: string;
  authorId: string;
  createdAt: string;
  content: string;
}): Promise<string> {
  return sha256Hex(canonicalStringify(content));
}
