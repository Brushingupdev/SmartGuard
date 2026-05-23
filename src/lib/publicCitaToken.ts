import { signValue, verifyValue } from "@/utils/cookie-signing";

const DEFAULT_PUBLIC_CITA_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface PublicCitaTokenData {
  companyId: string;
  plant: string;
  exp: number;
}

function getPublicCitaTokenSecret(): string | null {
  return process.env.PUBLIC_CITA_TOKEN_SECRET
    ?? process.env.IMPERSONATE_COOKIE_SECRET
    ?? null;
}

function encodePayload(data: PublicCitaTokenData): string {
  return Buffer.from(JSON.stringify(data), "utf-8").toString("base64url");
}

function decodePayload(encoded: string): PublicCitaTokenData | null {
  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8")) as Partial<PublicCitaTokenData>;
    if (
      typeof parsed.companyId !== "string" ||
      typeof parsed.plant !== "string" ||
      typeof parsed.exp !== "number"
    ) {
      return null;
    }
    if (!parsed.companyId || !parsed.plant || !Number.isFinite(parsed.exp)) return null;
    return {
      companyId: parsed.companyId,
      plant: parsed.plant,
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}

export function createPublicCitaToken(input: {
  companyId: string;
  plant: string;
  ttlMs?: number;
  now?: number;
}): string {
  const secret = getPublicCitaTokenSecret();
  if (!secret) {
    throw new Error("PUBLIC_CITA_TOKEN_SECRET no configurado");
  }

  const payload = encodePayload({
    companyId: input.companyId,
    plant: input.plant,
    exp: (input.now ?? Date.now()) + (input.ttlMs ?? DEFAULT_PUBLIC_CITA_TTL_MS),
  });

  return signValue(payload, secret);
}

function verifySignedPublicCitaToken(token: string, now = Date.now()): PublicCitaTokenData | null {
  const secret = getPublicCitaTokenSecret();
  if (!secret) return null;

  const payload = verifyValue(token, secret);
  if (!payload) return null;

  const decoded = decodePayload(payload);
  if (!decoded) return null;
  if (decoded.exp <= now) return null;
  return decoded;
}

function decodeLegacyPublicCitaToken(token: string): PublicCitaTokenData | null {
  try {
    const decoded = Buffer.from(decodeURIComponent(token), "base64url").toString("utf-8");
    const sep = decoded.indexOf("|");
    if (sep < 1) return null;
    const companyId = decoded.slice(0, sep);
    const plant = decoded.slice(sep + 1);
    if (!companyId || !plant) return null;
    return {
      companyId,
      plant,
      exp: Number.POSITIVE_INFINITY,
    };
  } catch {
    return null;
  }
}

export function readPublicCitaToken(token: string, now = Date.now()): (PublicCitaTokenData & { legacy: boolean }) | null {
  const verified = verifySignedPublicCitaToken(token, now);
  if (verified) return { ...verified, legacy: false };

  if (process.env.ALLOW_LEGACY_PUBLIC_CITA_TOKENS !== "true") {
    return null;
  }

  const legacy = decodeLegacyPublicCitaToken(token);
  if (!legacy) return null;
  return { ...legacy, legacy: true };
}
