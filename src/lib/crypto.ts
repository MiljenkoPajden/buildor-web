/**
 * Client-side encryption utilities for the credential vault.
 * Uses Web Crypto API — AES-GCM with PBKDF2 key derivation.
 * The server NEVER sees plaintext passwords.
 */

const PBKDF2_ITERATIONS = 310_000;
const KEY_LENGTH = 256;
const SALT_LENGTH = 16;
const IV_LENGTH = 12;

function toBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function fromBase64(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr.buffer;
}

/** Derive an AES-GCM key from a master password + salt using PBKDF2. */
export async function deriveKey(password: string, salt: ArrayBuffer): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Generate a random salt (store per-user in profile_settings). */
export function generateSalt(): string {
  const buf = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  return toBase64(buf.buffer);
}

/** Encrypt plaintext → { ciphertext, iv } (both base64). */
export async function encrypt(plaintext: string, key: CryptoKey): Promise<{ ciphertext: string; iv: string }> {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext),
  );
  return { ciphertext: toBase64(ct), iv: toBase64(iv.buffer) };
}

/** Decrypt ciphertext + iv → plaintext. Throws on wrong key. */
export async function decrypt(ciphertext: string, iv: string, key: CryptoKey): Promise<string> {
  const dec = new TextDecoder();
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(iv) },
    key,
    fromBase64(ciphertext),
  );
  return dec.decode(pt);
}

/** Convert base64 salt string back to ArrayBuffer for key derivation. */
export function saltFromBase64(b64: string): ArrayBuffer {
  return fromBase64(b64);
}
