import { NextResponse } from "next/server";

export function successResponse(data: any, message?: string, status: number = 200) {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(message ? { message } : {}),
    },
    { status }
  );
}

export function errorResponse(message: string, code: string = "BAD_REQUEST", status: number = 400) {
  return NextResponse.json(
    {
      success: false,
      message,
      code,
    },
    { status }
  );
}

// In-memory sliding window rate limiter
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export function checkRateLimit(key: string, maxRequests = 5, windowMs = 60000): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  record.count += 1;
  return { allowed: true, remaining: maxRequests - record.count };
}
