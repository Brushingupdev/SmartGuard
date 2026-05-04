import { createHmac, timingSafeEqual } from "crypto";

export function signValue(value: string, secret: string): string {
  const mac = createHmac("sha256", secret).update(value).digest("hex");
  return `${value}.${mac}`;
}

// Returns the original value if signature is valid, null otherwise.
export function verifyValue(signed: string, secret: string): string | null {
  const dot = signed.lastIndexOf(".");
  if (dot === -1) return null;
  const value = signed.slice(0, dot);
  const provided = signed.slice(dot + 1);
  if (provided.length !== 64) return null; // sha256 hex is always 64 chars
  const expected = createHmac("sha256", secret).update(value).digest("hex");
  try {
    if (!timingSafeEqual(Buffer.from(provided, "hex"), Buffer.from(expected, "hex"))) return null;
  } catch {
    return null;
  }
  return value;
}
