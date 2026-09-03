import { and, count, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { z } from "zod";
import {
  CreateBusinessBody,
  CreateCommentBody,
  CreatePostBody,
  GetBusinessParams,
  JoinBusinessParams,
  ListAdminBusinessesQueryParams,
  ListAdminUsersQueryParams,
  ListBusinessesQueryParams,
  ListBusinessMembersParams,
  ListBusinessPostsParams,
  ListCommentsParams,
  ListNotificationsResponse,
  LoginBody,
  MarkNotificationReadParams,
  ReactToPostParams,
  RegisterBody,
  UpdateBusinessBody,
  UpdateBusinessParams,
  UpdateBusinessStatusBody,
  UpdateBusinessStatusParams,
  UpdatePostBody,
  UpdatePostParams,
  UpdateUserStatusBody,
  UpdateUserStatusParams,
} from "@workspace/api-zod";
import {
  analyticsEventsTable,
  businessMembersTable,
  businessesTable,
  categoriesTable,
  commentsTable,
  notificationsTable,
  passwordResetTokensTable,
  postsTable,
  sessionsTable,
  reactionsTable,
  transactionsTable,
  usersTable,
} from "@workspace/db";
import { db } from "@workspace/db";
import { writeAuditLog } from "../lib/audit";
import {
  createSession,
  destroySession,
  getRequestUser,
  requireLocalUser,
  requireRole,
} from "../lib/auth";
import { createToken, hashPassword, hashToken, verifyPassword } from "../lib/password";
import { rateLimit } from "../lib/rate-limit";
import {
  activityCopy,
  businessFilters,
  businessView,
  categoryView,
  commentsView,
  notificationFor,
  postView,
  recentPostsForBusiness,
  slugify,
  sortBusinesses,
  trackEvent,
} from "../lib/mokominote";
import { createCheckout, listPaymentProducts, paymentMode } from "../services/payment/payment.service";
import { parseDataUrl, storeImage } from "../services/storage/storage.service";

const router: IRouter = Router();
const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
const ExtraBusinessFields = z.object({
  openingHours: z.record(z.string(), z.string()).optional(),
  socialLinks: z.record(z.string(), z.string()).optional(),
});
const ProfileUpdateBody = z.object({
  name: z.string().min(2).optional(),
  bio: z.string().max(500).optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
});
const ForgotPasswordBody = z.object({ email: z.email() });
const ResetPasswordBody = z.object({
  token: z.string().min(16),
  password: z.string().min(8),
});
const CheckoutBody = z.object({
  productId: z.string().min(1),
  businessId: z.string().optional(),
});
const UploadBody = z.object({
  kind: z.enum(["avatar", "logo", "cover", "post"]),
  dataUrl: z.string().min(20),
});
const PostStatusBody = z.object({
  status: z.enum(["published", "hidden"]),
});

async function mapInBatches<T, R>(items: T[], batchSize: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const result: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    result.push(...(await Promise.all(chunk.map(fn))));
  }
  return result;
}

function optionalUrl(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function userSummary(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
    bio: user.bio,
    xpPoints: user.xpPoints,
    loyaltyPoints: user.loyaltyPoints,
  };
}

router.get("/auth/me", async (req, res): Promise<void> => {
  const user = await getRequestUser(req);
  if (!user) {
    res.status(401).json({ success: false, message: "Authentication required", code: "UNAUTHORIZED" });
    return;
  }
  res.json(userSummary(user));
});

router.patch("/auth/me", async (req, res): Promise<void> => {
  const user = await requireLocalUser(req, res);
  if (!user) return;
  const parsed = ProfileUpdateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: "Please check your profile details.", code: "INVALID_PROFILE" });
    return;
  }
  const [updated] = await db
    .update(usersTable)
    .set({
      name: parsed.data.name ?? user.name,
      bio: parsed.data.bio === undefined ? user.bio : parsed.data.bio,
      avatarUrl: parsed.data.avatarUrl === undefined ? user.avatarUrl : parsed.data.avatarUrl,
      updatedAt: new Date(),
    })
    .where(eq(usersTable.id, user.id))
    .returning();
  res.json(userSummary(updated ?? user));
});

router.post("/auth/register", authLimit, async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: "Please check your details and try again.", code: "INVALID_REGISTER" });
    return;
  }
  const email = parsed.data.email.toLowerCase().trim();
  const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing[0]) {
    res.status(409).json({ success: false, message: "An account with that email already exists.", code: "EMAIL_TAKEN" });
    return;
  }
  const [user] = await db
    .insert(usersTable)
    .values({
      id: crypto.randomUUID(),
      name: parsed.data.name.trim(),
      email,
      passwordHash: await hashPassword(parsed.data.password),
      role: parsed.data.role,
      status: "active",
    })
    .returning();
  await createSession(res, user.id);
  await writeAuditLog({ actorId: user.id, action: "user.register", entityType: "user", entityId: user.id, metadata: { role: user.role } });
  res.status(201).json(userSummary(user));
});

router.post("/auth/login", authLimit, async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: "Please check your details and try again.", code: "INVALID_LOGIN" });
    return;
  }
  const email = parsed.data.email.toLowerCase().trim();
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  const passwordOk = user ? await verifyPassword(parsed.data.password, user.passwordHash) : false;
  if (!user || !passwordOk) {
    res.status(401).json({ success: false, message: "Incorrect email or password.", code: "INVALID_CREDENTIALS" });
    return;
  }
  if (user.status === "suspended") {
    res.status(403).json({ success: false, message: "This account is suspended.", code: "ACCOUNT_SUSPENDED" });
    return;
  }
  await createSession(res, user.id);
  await writeAuditLog({ actorId: user.id, action: "user.login", entityType: "user", entityId: user.id });
  res.json(userSummary(user));
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  await destroySession(req, res);
  res.sendStatus(204);
});

router.post("/auth/forgot-password", authLimit, async (req, res): Promise<void> => {
  const parsed = ForgotPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: "Enter a valid email address.", code: "INVALID_EMAIL" });
    return;
  }
  const email = parsed.data.email.toLowerCase().trim();
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  const payload: { success: true; devResetToken?: string } = { success: true };
  if (user) {
    const token = createToken();
    await db.insert(passwordResetTokensTable).values({
      id: crypto.randomUUID(),
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    if (process.env.NODE_ENV !== "production") payload.devResetToken = token;
  }
  res.json(payload);
});

router.post("/auth/reset-password", authLimit, async (req, res): Promise<void> => {
  const parsed = ResetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: "Reset link or password is not valid.", code: "INVALID_RESET" });
    return;
  }
  const [reset] = await db
    .select()
    .from(passwordResetTokensTable)
    .where(eq(passwordResetTokensTable.tokenHash, hashToken(parsed.data.token)))
    .limit(1);
  if (!reset || reset.usedAt || reset.expiresAt.getTime() < Date.now()) {
    res.status(400).json({ success: false, message: "This reset link has expired. Request a new one.", code: "RESET_EXPIRED" });
    return;
  }
  await db.update(usersTable).set({ passwordHash: await hashPassword(parsed.data.password), updatedAt: new Date() }).where(eq(usersTable.id, reset.userId));
  await db.update(passwordResetTokensTable).set({ usedAt: new Date(), updatedAt: new Date() }).where(eq(passwordResetTokensTable.id, reset.id));
  await db.delete(sessionsTable).where(eq(sessionsTable.userId, reset.userId));
  await writeAuditLog({ actorId: reset.userId, action: "user.password_reset", entityType: "user", entityId: reset.userId });
  res.json({ success: true });
});

router.get("/categories", async (_req, res): Promise<void> => {
  const categories = await db.select().from(categoriesTable).where(eq(categoriesTable.active, true)).orderBy(categoriesTable.name);
  // `categoryView()` does extra DB work; batch to avoid pool exhaustion.
  res.json(await mapInBatches(categories, 3, categoryView));
});

router.get("/businesses", async (req, res): Promise<void> => {
  const parsed = ListBusinessesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.message, code: "INVALID_QUERY" });
    return;
  }
  const { search, category, district, village, sort, page, pageSize } = parsed.data;
  const filters = await businessFilters(search, category, district, village);
  const [rows, totalRows] = await Promise.all([
    db.select().from(businessesTable).where(and(...filters)).orderBy(sortBusinesses(sort)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ value: count() }).from(businessesTable).where(and(...filters)),
  ]);
  const items = await mapInBatches(rows, 3, businessView);
  res.json({ items, page, pageSize, total: Number(totalRows[0]?.value ?? 0) });
});

router.get("/businesses/owned", async (req, res): Promise<void> => {
  const user = await requireRole(req, res, ["owner", "admin"]);
  if (!user) return;
  const rows = await db.select().from(businessesTable).where(eq(businessesTable.ownerId, user.id)).orderBy(desc(businessesTable.createdAt));
  res.json(await mapInBatches(rows, 3, businessView));
});

router.post("/businesses", async (req, res): Promise<void> => {
  const user = await requireLocalUser(req, res);
  if (!user) return;
  const parsed = CreateBusinessBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.message, code: "INVALID_BUSINESS" });
    return;
  }
  const category = await db.select().from(categoriesTable).where(eq(categoriesTable.id, parsed.data.categoryId)).limit(1);
  if (!category[0]) {
    res.status(400).json({ message: "Choose a valid category", code: "INVALID_CATEGORY" });
    return;
  }
  const baseSlug = slugify(parsed.data.name);
  const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;
  const [business] = await db.insert(businessesTable).values({
    id: crypto.randomUUID(),
    ownerId: user.id,
    name: parsed.data.name,
    slug,
    description: parsed.data.description,
    categoryId: parsed.data.categoryId,
    district: parsed.data.district,
    village: parsed.data.village,
    address: parsed.data.address ?? null,
    phone: parsed.data.phone ?? null,
    email: optionalUrl(parsed.data.email),
    website: optionalUrl(parsed.data.website),
    logoUrl: optionalUrl(parsed.data.logoUrl),
    coverImageUrl: optionalUrl(parsed.data.coverImageUrl),
    openingHours: ExtraBusinessFields.safeParse(req.body).data?.openingHours ?? {},
    socialLinks: ExtraBusinessFields.safeParse(req.body).data?.socialLinks ?? {},
  }).returning();
  if (user.role === "member") {
    await db.update(usersTable).set({ role: "owner", updatedAt: new Date() }).where(eq(usersTable.id, user.id));
  }
  res.status(201).json(await businessView(business));
});

router.get("/businesses/:slug", async (req, res): Promise<void> => {
  const params = GetBusinessParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: params.error.message, code: "INVALID_BUSINESS" });
    return;
  }
  const [business] = await db.select().from(businessesTable).where(eq(businessesTable.slug, params.data.slug)).limit(1);
  const viewer = await getRequestUser(req);
  if (!business) {
    res.status(404).json({ message: "Business not found", code: "NOT_FOUND" });
    return;
  }
  const canPreview = viewer && (viewer.role === "admin" || viewer.id === business.ownerId);
  if (business.status !== "approved" && !canPreview) {
    res.status(404).json({ message: "Business not found", code: "NOT_FOUND" });
    return;
  }
  const [membership] = viewer
    ? await db.select({ id: businessMembersTable.id }).from(businessMembersTable).where(and(eq(businessMembersTable.businessId, business.id), eq(businessMembersTable.userId, viewer.id))).limit(1)
    : [];
  const base = await businessView(business);
  await trackEvent("profile_viewed", business.id, viewer?.id);
  res.json({
    ...base,
    openingHours: business.openingHours,
    socialLinks: business.socialLinks,
    posts: await recentPostsForBusiness(business.id, viewer?.id),
    isMember: Boolean(membership),
  });
});

router.patch("/businesses/:id", async (req, res): Promise<void> => {
  const user = await requireRole(req, res, ["owner", "admin"]);
  if (!user) return;
  const params = UpdateBusinessParams.safeParse(req.params);
  const parsed = UpdateBusinessBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ message: "Invalid business update", code: "INVALID_BUSINESS" });
    return;
  }
  const [existing] = await db.select().from(businessesTable).where(eq(businessesTable.id, params.data.id)).limit(1);
  if (!existing || (user.role !== "admin" && existing.ownerId !== user.id)) {
    res.status(403).json({ message: "You do not own this business", code: "FORBIDDEN" });
    return;
  }
  const extras = ExtraBusinessFields.safeParse(req.body);
  const [updated] = await db.update(businessesTable).set({
    name: parsed.data.name,
    description: parsed.data.description,
    categoryId: parsed.data.categoryId,
    district: parsed.data.district,
    village: parsed.data.village,
    address: parsed.data.address ?? null,
    phone: parsed.data.phone ?? null,
    email: optionalUrl(parsed.data.email),
    website: optionalUrl(parsed.data.website),
    logoUrl: optionalUrl(parsed.data.logoUrl),
    coverImageUrl: optionalUrl(parsed.data.coverImageUrl),
    openingHours: extras.success && extras.data.openingHours ? extras.data.openingHours : existing.openingHours,
    socialLinks: extras.success && extras.data.socialLinks ? extras.data.socialLinks : existing.socialLinks,
    updatedAt: new Date(),
  }).where(eq(businessesTable.id, existing.id)).returning();
  res.json(await businessView(updated));
});

router.post("/businesses/:id/join", async (req, res): Promise<void> => {
  const user = await requireLocalUser(req, res);
  if (!user) return;
  const params = JoinBusinessParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: params.error.message, code: "INVALID_BUSINESS" });
    return;
  }
  const [business] = await db.select().from(businessesTable).where(and(eq(businessesTable.id, params.data.id), eq(businessesTable.status, "approved"))).limit(1);
  if (!business) {
    res.status(404).json({ message: "Business not found", code: "NOT_FOUND" });
    return;
  }
  const [existing] = await db.select({ id: businessMembersTable.id }).from(businessMembersTable).where(and(eq(businessMembersTable.businessId, business.id), eq(businessMembersTable.userId, user.id))).limit(1);
  let joined = true;
  if (existing) {
    await db.delete(businessMembersTable).where(eq(businessMembersTable.id, existing.id));
    joined = false;
  } else {
    await db.insert(businessMembersTable).values({ id: crypto.randomUUID(), businessId: business.id, userId: user.id });
    await notificationFor(business.ownerId, "new_member", "New community member", `${user.name} joined ${business.name}.`, `/businesses/${business.slug}`);
    await trackEvent("business_joined", business.id, user.id);
  }
  const [members] = await db.select({ value: count() }).from(businessMembersTable).where(eq(businessMembersTable.businessId, business.id));
  res.json({ joined, memberCount: Number(members?.value ?? 0) });
});

router.get("/businesses/:id/members", async (req, res): Promise<void> => {
  const user = await requireRole(req, res, ["owner", "admin"]);
  if (!user) return;
  const params = ListBusinessMembersParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: params.error.message, code: "INVALID_BUSINESS" });
    return;
  }
  const [business] = await db.select().from(businessesTable).where(eq(businessesTable.id, params.data.id)).limit(1);
  if (!business || (user.role !== "admin" && business.ownerId !== user.id)) {
    res.status(403).json({ message: "You do not own this business", code: "FORBIDDEN" });
    return;
  }
  const members = await db.select({
    id: usersTable.id,
    name: usersTable.name,
    avatarUrl: usersTable.avatarUrl,
    joinedAt: businessMembersTable.createdAt,
  }).from(businessMembersTable).innerJoin(usersTable, eq(businessMembersTable.userId, usersTable.id)).where(eq(businessMembersTable.businessId, business.id)).orderBy(desc(businessMembersTable.createdAt));
  res.json(members.map((member) => ({ ...member, joinedAt: member.joinedAt.toISOString() })));
});

router.get("/businesses/:id/posts", async (req, res): Promise<void> => {
  const params = ListBusinessPostsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: params.error.message, code: "INVALID_BUSINESS" });
    return;
  }
  const viewer = await getRequestUser(req);
  const posts = await recentPostsForBusiness(params.data.id, viewer?.id);
  res.json({ items: posts, page: 1, total: posts.length });
});

router.post("/businesses/:id/posts", async (req, res): Promise<void> => {
  const user = await requireRole(req, res, ["owner", "admin"]);
  if (!user) return;
  const params = ListBusinessPostsParams.safeParse(req.params);
  const parsed = CreatePostBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ message: "Invalid post", code: "INVALID_POST" });
    return;
  }
  const [business] = await db.select().from(businessesTable).where(eq(businessesTable.id, params.data.id)).limit(1);
  if (!business || (user.role !== "admin" && business.ownerId !== user.id)) {
    res.status(403).json({ message: "You do not own this business", code: "FORBIDDEN" });
    return;
  }
  const [post] = await db.insert(postsTable).values({
    id: crypto.randomUUID(),
    businessId: business.id,
    authorId: user.id,
    type: parsed.data.type,
    title: parsed.data.title,
    content: parsed.data.content,
    imageUrl: parsed.data.imageUrl ?? null,
  }).returning();
  const members = await db.select({ userId: businessMembersTable.userId }).from(businessMembersTable).where(eq(businessMembersTable.businessId, business.id)).limit(50);
  await Promise.all(
    members
      .filter((member) => member.userId !== user.id)
      .map((member) =>
        notificationFor(member.userId, "new_post", `${business.name} posted`, parsed.data.title, `/businesses/${business.slug}`),
      ),
  );
  res.status(201).json(await postView(post, user.id));
});

router.patch("/posts/:id", async (req, res): Promise<void> => {
  const user = await requireRole(req, res, ["owner", "admin"]);
  if (!user) return;
  const params = UpdatePostParams.safeParse(req.params);
  const parsed = UpdatePostBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ message: "Invalid post", code: "INVALID_POST" });
    return;
  }
  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, params.data.id)).limit(1);
  if (!post) {
    res.status(404).json({ message: "Post not found", code: "NOT_FOUND" });
    return;
  }
  const [business] = await db.select().from(businessesTable).where(eq(businessesTable.id, post.businessId)).limit(1);
  if (!business || (user.role !== "admin" && business.ownerId !== user.id)) {
    res.status(403).json({ message: "You do not own this post", code: "FORBIDDEN" });
    return;
  }
  const [updated] = await db.update(postsTable).set({ ...parsed.data, imageUrl: parsed.data.imageUrl ?? null, updatedAt: new Date() }).where(eq(postsTable.id, post.id)).returning();
  res.json(await postView(updated, user.id));
});

router.delete("/posts/:id", async (req, res): Promise<void> => {
  const user = await requireRole(req, res, ["owner", "admin"]);
  if (!user) return;
  const params = UpdatePostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: params.error.message, code: "INVALID_POST" });
    return;
  }
  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, params.data.id)).limit(1);
  if (!post) {
    res.status(404).json({ message: "Post not found", code: "NOT_FOUND" });
    return;
  }
  const [business] = await db.select().from(businessesTable).where(eq(businessesTable.id, post.businessId)).limit(1);
  if (!business || (user.role !== "admin" && business.ownerId !== user.id)) {
    res.status(403).json({ message: "You do not own this post", code: "FORBIDDEN" });
    return;
  }
  await db.delete(postsTable).where(eq(postsTable.id, post.id));
  res.sendStatus(204);
});

router.post("/posts/:id/like", async (req, res): Promise<void> => {
  const user = await requireLocalUser(req, res);
  if (!user) return;
  const params = ReactToPostParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: params.error.message, code: "INVALID_POST" });
    return;
  }
  const [existing] = await db.select().from(reactionsTable).where(and(eq(reactionsTable.postId, params.data.id), eq(reactionsTable.userId, user.id), eq(reactionsTable.type, "like"))).limit(1);
  if (existing) await db.delete(reactionsTable).where(eq(reactionsTable.id, existing.id));
  else {
    await db.insert(reactionsTable).values({ id: crypto.randomUUID(), postId: params.data.id, userId: user.id, type: "like" });
    const [post] = await db.select().from(postsTable).where(eq(postsTable.id, params.data.id)).limit(1);
    if (post) {
      await trackEvent("post_liked", post.businessId, user.id, post.id);
      const [business] = await db.select().from(businessesTable).where(eq(businessesTable.id, post.businessId)).limit(1);
      if (business && business.ownerId !== user.id) {
        await notificationFor(business.ownerId, "new_reaction", "New reaction", `${user.name} liked ${post.title}.`, `/businesses/${business.slug}`);
      }
    }
  }
  const [likes] = await db.select({ value: count() }).from(reactionsTable).where(and(eq(reactionsTable.postId, params.data.id), eq(reactionsTable.type, "like")));
  res.json({ liked: !existing, likeCount: Number(likes?.value ?? 0) });
});

router.get("/posts/:id/comments", async (req, res): Promise<void> => {
  const params = ListCommentsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: params.error.message, code: "INVALID_POST" });
    return;
  }
  res.json(await commentsView(params.data.id));
});

router.post("/posts/:id/comments", async (req, res): Promise<void> => {
  const user = await requireLocalUser(req, res);
  if (!user) return;
  const params = ListCommentsParams.safeParse(req.params);
  const parsed = CreateCommentBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ message: "Invalid comment", code: "INVALID_COMMENT" });
    return;
  }
  const [comment] = await db.insert(commentsTable).values({ id: crypto.randomUUID(), postId: params.data.id, userId: user.id, content: parsed.data.content }).returning();
  const [view] = await db.select({
    id: commentsTable.id,
    postId: commentsTable.postId,
    content: commentsTable.content,
    createdAt: commentsTable.createdAt,
    userName: usersTable.name,
    avatarUrl: usersTable.avatarUrl,
  }).from(commentsTable).innerJoin(usersTable, eq(commentsTable.userId, usersTable.id)).where(eq(commentsTable.id, comment.id)).limit(1);
  const [post] = await db.select().from(postsTable).where(eq(postsTable.id, params.data.id)).limit(1);
  if (post) {
    await trackEvent("post_commented", post.businessId, user.id, post.id);
    const [business] = await db.select().from(businessesTable).where(eq(businessesTable.id, post.businessId)).limit(1);
    if (business && business.ownerId !== user.id) await notificationFor(business.ownerId, "new_comment", "New comment", `${user.name} commented on ${post.title}.`, `/businesses/${business.slug}`);
  }
  res.status(201).json(view ? { ...view, createdAt: view.createdAt.toISOString() } : view);
});

router.get("/notifications", async (req, res): Promise<void> => {
  const user = await requireLocalUser(req, res);
  if (!user) return;
  const rows = await db.select().from(notificationsTable).where(eq(notificationsTable.userId, user.id)).orderBy(desc(notificationsTable.createdAt)).limit(30);
  res.json(ListNotificationsResponse.parse(rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }))));
});

router.patch("/notifications/:id/read", async (req, res): Promise<void> => {
  const user = await requireLocalUser(req, res);
  if (!user) return;
  const params = MarkNotificationReadParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ message: params.error.message, code: "INVALID_NOTIFICATION" });
    return;
  }
  const [notification] = await db.update(notificationsTable).set({ read: true, updatedAt: new Date() }).where(and(eq(notificationsTable.id, params.data.id), eq(notificationsTable.userId, user.id))).returning();
  if (!notification) {
    res.status(404).json({ message: "Notification not found", code: "NOT_FOUND" });
    return;
  }
  res.json({ ...notification, createdAt: notification.createdAt.toISOString() });
});

router.get("/dashboard/member", async (req, res): Promise<void> => {
  const user = await requireLocalUser(req, res);
  if (!user) return;
  const joinedRows = await db.select({ business: businessesTable }).from(businessMembersTable).innerJoin(businessesTable, eq(businessMembersTable.businessId, businessesTable.id)).where(eq(businessMembersTable.userId, user.id)).orderBy(desc(businessMembersTable.createdAt));
  const joinedBusinesses = await mapInBatches(joinedRows, 3, ({ business }) => businessView(business));
  const joinedIds = joinedRows.map(({ business }) => business.id);
  const recentRows = joinedIds.length
    ? await db.select().from(postsTable).where(and(eq(postsTable.status, "published"), inArray(postsTable.businessId, joinedIds))).orderBy(desc(postsTable.createdAt)).limit(12)
    : [];
  const notifications = await db.select().from(notificationsTable).where(eq(notificationsTable.userId, user.id)).orderBy(desc(notificationsTable.createdAt)).limit(8);
  const likes = await db.select({ value: count() }).from(reactionsTable).where(eq(reactionsTable.userId, user.id));
  const comments = await db.select({ value: count() }).from(commentsTable).where(eq(commentsTable.userId, user.id));
  res.json({
    joinedBusinesses,
    recentPosts: await mapInBatches(recentRows, 3, (post) => postView(post, user.id)),
    notifications: notifications.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })),
    stats: { businessesJoined: joinedBusinesses.length, postsLiked: Number(likes[0]?.value ?? 0), commentsMade: Number(comments[0]?.value ?? 0) },
  });
});

async function analyticsFor(businessId?: string) {
  const rows = await db.select({ createdAt: analyticsEventsTable.createdAt, type: analyticsEventsTable.type }).from(analyticsEventsTable).where(businessId ? eq(analyticsEventsTable.businessId, businessId) : undefined).orderBy(desc(analyticsEventsTable.createdAt)).limit(100);
  const byDate = new Map<string, { views: number; joins: number; engagement: number }>();
  for (const row of rows) {
    const date = row.createdAt.toISOString().slice(0, 10);
    const current = byDate.get(date) ?? { views: 0, joins: 0, engagement: 0 };
    if (row.type === "profile_viewed") current.views += 1;
    else if (row.type === "business_joined") current.joins += 1;
    else current.engagement += 1;
    byDate.set(date, current);
  }
  return Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, values]) => ({ date, ...values }));
}

router.get("/dashboard/business", async (req, res): Promise<void> => {
  const user = await requireRole(req, res, ["owner", "admin"]);
  if (!user) return;
  const [business] = await db.select().from(businessesTable).where(eq(businessesTable.ownerId, user.id)).orderBy(desc(businessesTable.createdAt)).limit(1);
  if (!business) {
    res.status(404).json({ message: "Create a business profile to unlock your dashboard", code: "BUSINESS_REQUIRED" });
    return;
  }
  const view = await businessView(business);
  const analytics = await analyticsFor(business.id);
  const activity = await db.select().from(analyticsEventsTable).where(eq(analyticsEventsTable.businessId, business.id)).orderBy(desc(analyticsEventsTable.createdAt)).limit(8);
  res.json({
    business: view,
    stats: { profileViews: analytics.reduce((sum, point) => sum + point.views, 0), members: view.memberCount, engagement: analytics.reduce((sum, point) => sum + point.engagement, 0), publishedPosts: view.postCount },
    recentActivity: activity.map((event) => {
      const copy = activityCopy(event.type);
      return { id: event.id, label: copy.label, description: copy.description, createdAt: event.createdAt.toISOString() };
    }),
    analytics,
  });
});

router.get("/dashboard/admin", async (req, res): Promise<void> => {
  const user = await requireRole(req, res, ["admin"]);
  if (!user) return;
  const [users, businesses, pending, active, posts, joins, views] = await Promise.all([
    db.select({ value: count() }).from(usersTable),
    db.select({ value: count() }).from(businessesTable),
    db.select({ value: count() }).from(businessesTable).where(eq(businessesTable.status, "pending")),
    db.select({ value: count() }).from(businessesTable).where(eq(businessesTable.status, "approved")),
    db.select({ value: count() }).from(postsTable),
    db.select({ value: count() }).from(analyticsEventsTable).where(eq(analyticsEventsTable.type, "business_joined")),
    db.select({ value: count() }).from(analyticsEventsTable).where(eq(analyticsEventsTable.type, "profile_viewed")),
  ]);
  const recentBusinesses = await db.select().from(businessesTable).orderBy(desc(businessesTable.createdAt)).limit(6);
  const recentUsers = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt)).limit(6);
  res.json({
    stats: { users: Number(users[0]?.value ?? 0), businesses: Number(businesses[0]?.value ?? 0), pendingBusinesses: Number(pending[0]?.value ?? 0), activeBusinesses: Number(active[0]?.value ?? 0), posts: Number(posts[0]?.value ?? 0), joins: Number(joins[0]?.value ?? 0), profileViews: Number(views[0]?.value ?? 0) },
    recentBusinesses: await mapInBatches(recentBusinesses, 3, businessView),
    recentUsers: recentUsers.map(userSummary),
    analytics: await analyticsFor(),
  });
});

router.get("/admin/users", async (req, res): Promise<void> => {
  const user = await requireRole(req, res, ["admin"]);
  if (!user) return;
  const parsed = ListAdminUsersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.message, code: "INVALID_QUERY" });
    return;
  }
  const { search, role, status, page } = parsed.data;
  const filters = [];
  if (search) filters.push(or(ilike(usersTable.name, `%${search}%`), ilike(usersTable.email, `%${search}%`))!);
  if (role) filters.push(eq(usersTable.role, role));
  if (status) filters.push(eq(usersTable.status, status));
  const rows = await db.select().from(usersTable).where(filters.length ? and(...filters) : undefined).orderBy(desc(usersTable.createdAt)).limit(20).offset((page - 1) * 20);
  const total = await db.select({ value: count() }).from(usersTable).where(filters.length ? and(...filters) : undefined);
  res.json({ items: rows.map(userSummary), page, total: Number(total[0]?.value ?? 0) });
});

router.patch("/admin/users/:id/status", async (req, res): Promise<void> => {
  const admin = await requireRole(req, res, ["admin"]);
  if (!admin) return;
  const params = UpdateUserStatusParams.safeParse(req.params);
  const parsed = UpdateUserStatusBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ message: "Invalid user status", code: "INVALID_STATUS" });
    return;
  }
  const [updated] = await db.update(usersTable).set({ status: parsed.data.status, updatedAt: new Date() }).where(eq(usersTable.id, params.data.id)).returning();
  if (!updated) {
    res.status(404).json({ message: "User not found", code: "NOT_FOUND" });
    return;
  }
  await notificationFor(updated.id, "admin_action", "Account status updated", `Your account is now ${updated.status}.`);
  await writeAuditLog({ actorId: admin.id, action: `user.${updated.status}`, entityType: "user", entityId: updated.id });
  res.json(userSummary(updated));
});

router.get("/admin/businesses", async (req, res): Promise<void> => {
  const admin = await requireRole(req, res, ["admin"]);
  if (!admin) return;
  const parsed = ListAdminBusinessesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.message, code: "INVALID_QUERY" });
    return;
  }
  const { search, status, page } = parsed.data;
  const filters = [];
  if (search) filters.push(or(ilike(businessesTable.name, `%${search}%`), ilike(businessesTable.village, `%${search}%`))!);
  if (status) filters.push(eq(businessesTable.status, status));
  const rows = await db.select().from(businessesTable).where(filters.length ? and(...filters) : undefined).orderBy(desc(businessesTable.createdAt)).limit(20).offset((page - 1) * 20);
  const total = await db.select({ value: count() }).from(businessesTable).where(filters.length ? and(...filters) : undefined);
  res.json({ items: await mapInBatches(rows, 3, businessView), page, pageSize: 20, total: Number(total[0]?.value ?? 0) });
});

router.patch("/admin/businesses/:id/status", async (req, res): Promise<void> => {
  const admin = await requireRole(req, res, ["admin"]);
  if (!admin) return;
  const params = UpdateBusinessStatusParams.safeParse(req.params);
  const parsed = UpdateBusinessStatusBody.safeParse(req.body);
  if (!params.success || !parsed.success) {
    res.status(400).json({ message: "Invalid business status", code: "INVALID_STATUS" });
    return;
  }
  const [updated] = await db.update(businessesTable).set({
    status: parsed.data.status,
    verificationStatus: parsed.data.status === "approved" ? "verified" : "unverified",
    updatedAt: new Date(),
  }).where(eq(businessesTable.id, params.data.id)).returning();
  if (!updated) {
    res.status(404).json({ message: "Business not found", code: "NOT_FOUND" });
    return;
  }
  await notificationFor(updated.ownerId, "business_status", `Business ${updated.status}`, `${updated.name} is now ${updated.status}.`, `/dashboard/business`);
  await writeAuditLog({ actorId: admin.id, action: `business.${updated.status}`, entityType: "business", entityId: updated.id });
  res.json(await businessView(updated));
});

router.patch("/notifications/read-all", async (req, res): Promise<void> => {
  const user = await requireLocalUser(req, res);
  if (!user) return;
  await db.update(notificationsTable).set({ read: true, updatedAt: new Date() }).where(eq(notificationsTable.userId, user.id));
  res.json({ success: true });
});

router.get("/community/feed", async (req, res): Promise<void> => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(20, Math.max(1, Number(req.query.pageSize) || 8));
  const viewer = await getRequestUser(req);
  const approved = await db.select({ id: businessesTable.id }).from(businessesTable).where(eq(businessesTable.status, "approved"));
  const ids = approved.map((row) => row.id);
  if (!ids.length) {
    res.json({ items: [], page, total: 0 });
    return;
  }
  const rows = await db
    .select()
    .from(postsTable)
    .where(and(eq(postsTable.status, "published"), inArray(postsTable.businessId, ids)))
    .orderBy(desc(postsTable.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const [totalRows] = await db
    .select({ value: count() })
    .from(postsTable)
    .where(and(eq(postsTable.status, "published"), inArray(postsTable.businessId, ids)));
  res.json({
    // Avoid pool exhaustion: `postView()` performs multiple sequential queries.
    items: await (async () => {
      const concurrency = 3;
      const result: Awaited<ReturnType<typeof postView>>[] = [];
      for (let i = 0; i < rows.length; i += concurrency) {
        const chunk = rows.slice(i, i + concurrency);
        result.push(...(await Promise.all(chunk.map((post) => postView(post, viewer?.id)))));
      }
      return result;
    })(),
    page,
    total: Number(totalRows?.value ?? 0),
  });
});

router.get("/admin/posts", async (req, res): Promise<void> => {
  const admin = await requireRole(req, res, ["admin"]);
  if (!admin) return;
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const page = Math.max(1, Number(req.query.page) || 1);
  const filters = status ? [eq(postsTable.status, status)] : [];
  const rows = await db.select().from(postsTable).where(filters.length ? and(...filters) : undefined).orderBy(desc(postsTable.createdAt)).limit(20).offset((page - 1) * 20);
  const [total] = await db.select({ value: count() }).from(postsTable).where(filters.length ? and(...filters) : undefined);
  // Avoid pool exhaustion: `postView()` runs multiple sequential queries.
  // Fetch in small batches instead of `Promise.all(rows.map(...))`.
  const concurrency = 3;
  const items: Awaited<ReturnType<typeof postView>>[] = [];
  for (let i = 0; i < rows.length; i += concurrency) {
    const chunk = rows.slice(i, i + concurrency);
    items.push(...(await Promise.all(chunk.map((post) => postView(post)))));
  }
  res.json({ items, page, total: Number(total?.value ?? 0) });
});

router.patch("/admin/posts/:id/status", async (req, res): Promise<void> => {
  const admin = await requireRole(req, res, ["admin"]);
  if (!admin) return;
  const parsed = PostStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: "Invalid post status", code: "INVALID_STATUS" });
    return;
  }
  const [updated] = await db.update(postsTable).set({ status: parsed.data.status, updatedAt: new Date() }).where(eq(postsTable.id, req.params.id)).returning();
  if (!updated) {
    res.status(404).json({ success: false, message: "Post not found", code: "NOT_FOUND" });
    return;
  }
  await writeAuditLog({ actorId: admin.id, action: `post.${parsed.data.status}`, entityType: "post", entityId: updated.id });
  res.json(await postView(updated));
});

router.get("/payments/products", async (_req, res): Promise<void> => {
  res.json({ items: listPaymentProducts(), mode: paymentMode() });
});

router.post("/payments/checkout", async (req, res): Promise<void> => {
  const user = await requireRole(req, res, ["owner", "admin"]);
  if (!user) return;
  const parsed = CheckoutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: "Choose a valid product.", code: "INVALID_CHECKOUT" });
    return;
  }
  try {
    const checkout = await createCheckout({
      productId: parsed.data.productId,
      userId: user.id,
      businessId: parsed.data.businessId,
    });
    res.status(201).json({
      ...checkout,
      message:
        checkout.mode === "development"
          ? "Payment provider is in development mode. No live charge was created."
          : "Continue to the payment provider to complete checkout.",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Checkout is unavailable.",
      code: "CHECKOUT_UNAVAILABLE",
    });
  }
});

router.get("/payments/transactions", async (req, res): Promise<void> => {
  const user = await requireLocalUser(req, res);
  if (!user) return;
  const rows =
    user.role === "admin"
      ? await db.select().from(transactionsTable).orderBy(desc(transactionsTable.createdAt)).limit(50)
      : await db.select().from(transactionsTable).where(eq(transactionsTable.userId, user.id)).orderBy(desc(transactionsTable.createdAt)).limit(50);
  res.json(
    rows.map((row) => ({
      id: row.id,
      type: row.type,
      amount: row.amount,
      currency: row.currency,
      status: row.status,
      provider: row.provider,
      createdAt: row.createdAt.toISOString(),
    })),
  );
});

router.post("/uploads", async (req, res): Promise<void> => {
  const user = await requireLocalUser(req, res);
  if (!user) return;
  const parsed = UploadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: "Choose a valid image.", code: "INVALID_UPLOAD" });
    return;
  }
  const file = parseDataUrl(parsed.data.dataUrl);
  if (!file) {
    res.status(400).json({ success: false, message: "Only JPEG, PNG, WebP, or GIF images are allowed.", code: "INVALID_UPLOAD" });
    return;
  }
  try {
    const stored = await storeImage({ buffer: file.buffer, mimeType: file.mimeType, kind: parsed.data.kind });
    res.status(201).json(stored);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Upload failed.",
      code: "UPLOAD_FAILED",
    });
  }
});

export default router;