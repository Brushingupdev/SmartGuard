import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Rate limiter distribuido con Upstash Redis.
// Si las env vars no están configuradas, retorna null (fallback: sin rate limiting).
// Esto permite que la app funcione en desarrollo sin Redis.

function createRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const redis = createRedisClient();

// Login: 10 intentos por IP cada 5 minutos
export const loginLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "5 m"),
      analytics: true,
      prefix: "sg:login",
    })
  : null;

// API general: 60 requests por minuto por IP
export const apiLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, "1 m"),
      analytics: true,
      prefix: "sg:api",
    })
  : null;

// Onboarding: 3 registros por hora por IP (anti-spam)
export const onboardingLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, "1 h"),
      analytics: true,
      prefix: "sg:onboarding",
    })
  : null;

/**
 * Verifica rate limit para una IP.
 * Retorna { success: true } si está dentro del límite,
 * o { success: false, retryAfter } si fue bloqueado.
 */
export async function checkRateLimit(
  limiter: typeof loginLimiter,
  identifier: string
): Promise<{ success: true } | { success: false; retryAfter: number }> {
  if (!limiter) return { success: true };

  const { success, reset } = await limiter.limit(identifier);
  if (success) return { success: true };

  const retryAfter = Math.ceil((reset - Date.now()) / 1000);
  return { success: false, retryAfter };
}
