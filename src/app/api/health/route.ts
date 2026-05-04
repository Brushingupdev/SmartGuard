import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  checks: {
    database: "ok" | "error";
    redis: "ok" | "error" | "not_configured";
  };
  uptime: number;
}

const startTime = Date.now();

export async function GET(req: NextRequest) {
  const auth  = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const secret = process.env.CRON_SECRET;
  const isAuthenticated = secret && token === secret;
  const checks: HealthStatus["checks"] = {
    database: "ok",
    redis: "not_configured",
  };

  // Check database connectivity
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("atenciones").select("id").limit(1);
    if (error) throw error;
  } catch {
    checks.database = "error";
  }

  // Check Redis connectivity (if configured)
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const { Redis } = await import("@upstash/redis");
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      await redis.ping();
      checks.redis = "ok";
    } catch {
      checks.redis = "error";
    }
  }

  const allOk = checks.database === "ok" && (checks.redis === "ok" || checks.redis === "not_configured");
  const anyError = checks.database === "error" || checks.redis === "error";

  const status: HealthStatus["status"] = allOk
    ? "healthy"
    : anyError
      ? "unhealthy"
      : "degraded";

  const httpStatus = status === "unhealthy" ? 503 : 200;
  const timestamp  = new Date().toISOString();

  if (!isAuthenticated) {
    return NextResponse.json({ status, timestamp }, { status: httpStatus });
  }

  const body: HealthStatus = {
    status,
    timestamp,
    version: process.env.npm_package_version ?? "0.1.0",
    checks,
    uptime: Math.floor((Date.now() - startTime) / 1000),
  };

  return NextResponse.json(body, { status: httpStatus });
}
