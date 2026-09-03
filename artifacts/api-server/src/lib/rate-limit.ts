import type { Request, Response, NextFunction } from "express";

type Bucket = { hits: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(options: { windowMs: number; max: number; key?: (req: Request) => string }) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = options.key?.(req) ?? `${req.ip}:${req.path}`;
    const now = Date.now();
    const current = buckets.get(key);
    if (!current || current.resetAt < now) {
      buckets.set(key, { hits: 1, resetAt: now + options.windowMs });
      next();
      return;
    }
    current.hits += 1;
    if (current.hits > options.max) {
      res.status(429).json({
        success: false,
        message: "Too many attempts. Please wait a moment and try again.",
        code: "RATE_LIMITED",
      });
      return;
    }
    next();
  };
}
