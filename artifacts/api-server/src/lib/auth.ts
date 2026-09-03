import { getAuth } from "@clerk/express";
import type { CookieOptions, NextFunction, Request, Response } from "express";
import { and, eq, gt } from "drizzle-orm";
import { db, sessionsTable, usersTable, type User } from "@workspace/db";
import { createToken, hashToken } from "./password";

export const SESSION_COOKIE = "mk_session";
const SESSION_DAYS = 14;

export type AuthenticatedRequest = Request & { localUser?: User };

function readCookie(req: Request, name: string): string | undefined {
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies;
  return cookies?.[name];
}

export function sessionCookieOptions(): CookieOptions {
  const production = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: production ? "none" : "lax",
    secure: production,
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: "/",
  };
}

export async function createSession(res: Response, userId: string): Promise<void> {
  const token = createToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessionsTable).values({
    id: crypto.randomUUID(),
    userId,
    tokenHash: hashToken(token),
    expiresAt,
  });
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions());
}

export async function destroySession(req: Request, res: Response): Promise<void> {
  const token = readCookie(req, SESSION_COOKIE);
  if (token) {
    await db.delete(sessionsTable).where(eq(sessionsTable.tokenHash, hashToken(token)));
  }
  res.clearCookie(SESSION_COOKIE, { ...sessionCookieOptions(), maxAge: 0 });
}

export async function userFromSession(req: Request): Promise<User | null> {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token) return null;
  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(and(eq(sessionsTable.tokenHash, hashToken(token)), gt(sessionsTable.expiresAt, new Date())))
    .limit(1);
  if (!session) return null;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
  return user ?? null;
}

async function userFromClerk(req: Request): Promise<User | null> {
  if (!process.env.CLERK_PUBLISHABLE_KEY) return null;
  let clerkId: string | null = null;
  try {
    clerkId = getAuth(req).userId;
  } catch {
    return null;
  }
  if (!clerkId) return null;

  const auth = getAuth(req);
  const claims = auth.sessionClaims as Record<string, unknown> | undefined;
  const email =
    typeof claims?.email === "string"
      ? claims.email
      : typeof claims?.primaryEmailAddress === "string"
        ? claims.primaryEmailAddress
        : `${clerkId}@clerk.local`;
  const name =
    typeof claims?.name === "string"
      ? claims.name
      : typeof claims?.fullName === "string"
        ? claims.fullName
        : "MoKominoté member";
  const avatarUrl = typeof claims?.imageUrl === "string" ? claims.imageUrl : null;

  const existing = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  if (existing[0]) return existing[0];

  const matchingEmail = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (matchingEmail[0]) {
    const [linked] = await db
      .update(usersTable)
      .set({ clerkId, name, avatarUrl, updatedAt: new Date() })
      .where(eq(usersTable.id, matchingEmail[0].id))
      .returning();
    return linked ?? matchingEmail[0];
  }

  const inserted = await db
    .insert(usersTable)
    .values({
      id: crypto.randomUUID(),
      clerkId,
      name,
      email,
      avatarUrl,
    })
    .onConflictDoNothing({ target: usersTable.clerkId })
    .returning();
  if (inserted[0]) return inserted[0];

  const raced = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId)).limit(1);
  return raced[0] ?? null;
}

export async function getRequestUser(req: Request): Promise<User | null> {
  return (await userFromSession(req)) ?? (await userFromClerk(req));
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  void getRequestUser(req).then((user) => {
    if (!user) {
      res.status(401).json({ success: false, message: "Authentication required", code: "UNAUTHORIZED" });
      return;
    }
    next();
  });
}

export async function getOrCreateLocalUser(req: Request): Promise<User | null> {
  return getRequestUser(req);
}

export async function requireLocalUser(req: Request, res: Response): Promise<User | null> {
  const user = await getRequestUser(req);
  if (!user) {
    res.status(401).json({ success: false, message: "Authentication required", code: "UNAUTHORIZED" });
    return null;
  }
  if (user.status === "suspended") {
    res.status(403).json({ success: false, message: "This account is suspended", code: "ACCOUNT_SUSPENDED" });
    return null;
  }
  return user;
}

export async function requireRole(req: Request, res: Response, roles: string[]): Promise<User | null> {
  const user = await requireLocalUser(req, res);
  if (!user) return null;
  if (!roles.includes(user.role)) {
    res.status(403).json({ success: false, message: "You do not have permission to do that", code: "FORBIDDEN" });
    return null;
  }
  return user;
}
