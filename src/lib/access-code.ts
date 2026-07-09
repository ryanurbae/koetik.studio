import { scryptSync, randomBytes, timingSafeEqual } from "crypto";

const KEYLEN = 64;
const PREFIX = "scrypt$";

export function hashAccessCode(code: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(code.toUpperCase(), salt, KEYLEN).toString("hex");
  return `${PREFIX}${salt}$${derived}`;
}

export function verifyAccessCode(code: string, stored: string | null): boolean {
  if (!stored) return false;

  // Legacy plaintext fallback (pre-hashing data)
  if (!stored.startsWith(PREFIX)) {
    return stored === code.toUpperCase();
  }

  const [, salt, derived] = stored.split("$");
  if (!salt || !derived) return false;

  const derivedBuf = Buffer.from(derived, "hex");
  const testBuf = scryptSync(code.toUpperCase(), salt, KEYLEN);

  return (
    derivedBuf.length === testBuf.length &&
    timingSafeEqual(derivedBuf, testBuf)
  );
}
