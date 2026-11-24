/**
 * Hash de senha com PBKDF2-SHA256 via WebCrypto (crypto.subtle).
 * Mantém verificação do formato legado (SHA-256 simples com sal) para migração transparente.
 */

export const PBKDF2_ITERATIONS = 210_000;
const PBKDF2_KEY_BITS = 256;

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.length % 2 === 0 ? hex : `0${hex}`;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16) || 0;
  }
  return out;
}

export function generateRandomHex(byteLength = 24): string {
  const arr = new Uint8Array(byteLength);
  crypto.getRandomValues(arr);
  return bytesToHex(arr);
}

export async function hashPasswordPbkdf2(
  password: string,
  saltHex: string,
  iterations = PBKDF2_ITERATIONS
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: hexToBytes(saltHex), iterations },
    key,
    PBKDF2_KEY_BITS
  );
  return bytesToHex(new Uint8Array(bits));
}

/** Formato legado (SHA-256 único). Usado apenas para verificar e migrar contas antigas. */
export async function hashPasswordLegacy(password: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:obsidian-codex:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(digest));
}

/** Comparação em tempo constante (para strings hex de mesmo formato). */
export function timingSafeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}
