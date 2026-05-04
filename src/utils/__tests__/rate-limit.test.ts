import { describe, it, expect, vi, beforeEach } from "vitest";

type MockLimiter = {
  limit: (identifier: string) => Promise<{ success: boolean; reset: number }>;
};

// Mock de Upstash Redis
vi.mock("@upstash/ratelimit", () => {
  return {
    Ratelimit: vi.fn().mockImplementation(() => ({
      limit: vi.fn().mockResolvedValue({ success: true, reset: Date.now() + 300000 }),
    })),
    slidingWindow: vi.fn(),
  };
});

vi.mock("@upstash/redis", () => {
  return {
    Redis: vi.fn().mockImplementation(() => ({
      ping: vi.fn().mockResolvedValue("PONG"),
    })),
  };
});

describe("rate-limit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Resetear módulos para que re-evalúe las env vars
    vi.resetModules();
  });

  it("checkRateLimit retorna success:true sin Redis configurado", async () => {
    // Sin env vars configuradas, los limiters son null
    const { checkRateLimit } = await import("@/utils/rate-limit");
    const result = await checkRateLimit(null, "test-ip");
    expect(result.success).toBe(true);
  });

  it("checkRateLimit retorna success:true cuando el limit permite", async () => {
    const { checkRateLimit } = await import("@/utils/rate-limit");
    const mockLimiter = {
      limit: vi.fn().mockResolvedValue({ success: true, reset: Date.now() + 300000 }),
    } satisfies MockLimiter;
    const result = await checkRateLimit(mockLimiter as never, "test-ip");
    expect(result.success).toBe(true);
    expect(mockLimiter.limit).toHaveBeenCalledWith("test-ip");
  });

  it("checkRateLimit retorna success:false con retryAfter cuando excede", async () => {
    const { checkRateLimit } = await import("@/utils/rate-limit");
    const futureReset = Date.now() + 120000; // 2 minutos en el futuro
    const mockLimiter = {
      limit: vi.fn().mockResolvedValue({ success: false, reset: futureReset }),
    } satisfies MockLimiter;
    const result = await checkRateLimit(mockLimiter as never, "test-ip");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.retryAfter).toBeGreaterThan(0);
      expect(result.retryAfter).toBeLessThanOrEqual(121);
    }
  });
});

describe("cache", () => {
  it("cacheKey genera claves determinísticas", async () => {
    const { cacheKey } = await import("@/utils/cache");
    expect(cacheKey("a", "b", "c")).toBe("a:b:c");
    expect(cacheKey("a", null, "c")).toBe("a:null:c");
    expect(cacheKey("a", undefined, "c")).toBe("a:null:c");
    expect(cacheKey(1, 2, 3)).toBe("1:2:3");
  });

  it("cacheKey con un solo argumento", async () => {
    const { cacheKey } = await import("@/utils/cache");
    expect(cacheKey("single")).toBe("single");
  });

  it("TTL constants tienen valores correctos", async () => {
    const { TTL_REALTIME, TTL_DYNAMIC, TTL_STATIC } = await import("@/utils/cache");
    expect(TTL_REALTIME).toBe(60);
    expect(TTL_DYNAMIC).toBe(300);
    expect(TTL_STATIC).toBe(3600);
  });
});
