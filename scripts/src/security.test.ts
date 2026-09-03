import assert from "node:assert/strict";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { test } from "node:test";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, salt, hash] = stored.split(":");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hash, "hex");
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

test("hashes and verifies a password", async () => {
  const stored = await hashPassword("DevPass123!");
  assert.equal(await verifyPassword("DevPass123!", stored), true);
  assert.equal(await verifyPassword("wrong-password", stored), false);
});

test("hashes tokens consistently", () => {
  const token = "abc123";
  const left = createHash("sha256").update(token).digest("hex");
  const right = createHash("sha256").update(token).digest("hex");
  assert.equal(left, right);
});
