import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALG = "aes-256-gcm";

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY ?? "";
  if (!hex || hex.length !== 64) {
    throw new Error("ENCRYPTION_KEY deve ser uma string hex de 64 caracteres (32 bytes).");
  }
  return Buffer.from(hex, "hex");
}

// Returns "iv:authTag:ciphertext" — all hex-encoded
export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALG, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decrypt(stored: string): string {
  const parts = stored.split(":");
  if (parts.length !== 3) return stored; // legacy plaintext — return as-is
  const [ivHex, tagHex, cipherHex] = parts;
  const decipher = createDecipheriv(ALG, getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return decipher.update(Buffer.from(cipherHex, "hex")).toString("utf8") + decipher.final("utf8");
}

// Returns true when the value looks like an encrypted blob
export function isEncrypted(value: string): boolean {
  const parts = value.split(":");
  return parts.length === 3 && parts[0].length === 24; // 12-byte IV = 24 hex chars
}
