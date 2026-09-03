import { and, asc, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import {
  businessMembersTable,
  businessesTable,
  categoriesTable,
  commentsTable,
  notificationsTable,
  postsTable,
  reactionsTable,
  usersTable,
  analyticsEventsTable,
  type Business,
  type Category,
} from "@workspace/db";
import { db } from "@workspace/db";

export const districts = [
  "Black River",
  "Flacq",
  "Grand Port",
  "Moka",
  "Pamplemousses",
  "Plaines Wilhems",
  "Port Louis",
  "Rivière du Rempart",
  "Savanne",
];

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function categoryView(category: Category) {
  const [businessCount] = await db
    .select({ value: count() })
    .from(businessesTable)
    .where(and(eq(businessesTable.categoryId, category.id), eq(businessesTable.status, "approved")));
  return { ...category, businessCount: Number(businessCount?.value ?? 0) };
}

export async function businessView(business: Business) {
  const [category] = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.id, business.categoryId))
    .limit(1);
  const [memberCount] = await db
    .select({ value: count() })
    .from(businessMembersTable)
    .where(eq(businessMembersTable.businessId, business.id));
  const [postCount] = await db
    .select({ value: count() })
    .from(postsTable)
    .where(and(eq(postsTable.businessId, business.id), eq(postsTable.status, "published")));
  return {
    id: business.id,
    ownerId: business.ownerId,
    name: business.name,
    slug: business.slug,
    description: business.description,
    category: category ? await categoryView(category) : {
      id: business.categoryId,
      name: "Local business",
      slug: "local-business",
      description: null,
      active: true,
      businessCount: 0,
    },
    district: business.district,
    village: business.village,
    address: business.address,
    phone: business.phone,
    email: business.email,
    website: business.website,
    logoUrl: business.logoUrl,
    coverImageUrl: business.coverImageUrl,
    status: business.status,
    verificationStatus: business.verificationStatus,
    premiumTier: business.premiumTier,
    memberCount: Number(memberCount?.value ?? 0),
    postCount: Number(postCount?.value ?? 0),
    createdAt: business.createdAt.toISOString(),
  };
}

export async function postView(post: typeof postsTable.$inferSelect, localUserId?: string) {
  const [business] = await db
    .select({ name: businessesTable.name, logoUrl: businessesTable.logoUrl })
    .from(businessesTable)
    .where(eq(businessesTable.id, post.businessId))
    .limit(1);
  const [author] = await db
    .select({ name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.id, post.authorId))
    .limit(1);
  const [likeCount] = await db
    .select({ value: count() })
    .from(reactionsTable)
    .where(and(eq(reactionsTable.postId, post.id), eq(reactionsTable.type, "like")));
  const [commentCount] = await db
    .select({ value: count() })
    .from(commentsTable)
    .where(eq(commentsTable.postId, post.id));
  let likedByMe = false;
  if (localUserId) {
    const [reaction] = await db
      .select({ id: reactionsTable.id })
      .from(reactionsTable)
      .where(and(eq(reactionsTable.postId, post.id), eq(reactionsTable.userId, localUserId), eq(reactionsTable.type, "like")))
      .limit(1);
    likedByMe = Boolean(reaction);
  }
  return {
    id: post.id,
    businessId: post.businessId,
    businessName: business?.name ?? "Local business",
    businessLogoUrl: business?.logoUrl ?? null,
    authorName: author?.name ?? "Business owner",
    type: post.type,
    title: post.title,
    content: post.content,
    imageUrl: post.imageUrl,
    status: post.status,
    createdAt: post.createdAt.toISOString(),
    likeCount: Number(likeCount?.value ?? 0),
    commentCount: Number(commentCount?.value ?? 0),
    likedByMe,
  };
}

export async function trackEvent(type: string, businessId?: string, userId?: string, postId?: string) {
  await db.insert(analyticsEventsTable).values({
    id: crypto.randomUUID(),
    type,
    businessId: businessId ?? null,
    userId: userId ?? null,
    postId: postId ?? null,
  });
}

export async function businessFilters(search?: string, category?: string, district?: string, village?: string) {
  const filters = [eq(businessesTable.status, "approved")];
  if (search) {
    filters.push(
      or(
        ilike(businessesTable.name, `%${search}%`),
        ilike(businessesTable.description, `%${search}%`),
        ilike(businessesTable.village, `%${search}%`),
        ilike(businessesTable.district, `%${search}%`),
      )!,
    );
  }
  if (category) {
    const [matched] = await db
      .select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(or(eq(categoriesTable.id, category), eq(categoriesTable.slug, category)))
      .limit(1);
    if (matched) filters.push(eq(businessesTable.categoryId, matched.id));
    else filters.push(eq(businessesTable.id, "__none__"));
  }
  if (district) filters.push(eq(businessesTable.district, district));
  if (village) filters.push(ilike(businessesTable.village, `%${village}%`));
  return filters;
}

export function activityCopy(type: string): { label: string; description: string } {
  if (type === "profile_viewed") return { label: "Profile viewed", description: "Someone looked at your public profile." };
  if (type === "business_joined") return { label: "New member", description: "Someone joined your community." };
  if (type === "post_liked") return { label: "Post liked", description: "A community member reacted to a post." };
  if (type === "post_commented") return { label: "New comment", description: "A community member left a comment." };
  return { label: type.replaceAll("_", " "), description: "Community activity recorded." };
}

export function sortBusinesses(sort: string | undefined) {
  if (sort === "members") {
    return desc(sql<number>`(select count(*) from mokominote_business_members m where m.business_id = ${businessesTable.id})`);
  }
  if (sort === "active") {
    return desc(sql<number>`(select count(*) from mokominote_posts p where p.business_id = ${businessesTable.id} and p.status = 'published')`);
  }
  return desc(businessesTable.createdAt);
}

export async function notificationFor(userId: string, type: string, title: string, message: string, href?: string) {
  await db.insert(notificationsTable).values({
    id: crypto.randomUUID(),
    userId,
    type,
    title,
    message,
    href: href ?? null,
  });
}

export async function recentPostsForBusiness(businessId: string, localUserId?: string) {
  const rows = await db
    .select()
    .from(postsTable)
    .where(and(eq(postsTable.businessId, businessId), eq(postsTable.status, "published")))
    .orderBy(desc(postsTable.createdAt))
    .limit(20);
  return Promise.all(rows.map((post) => postView(post, localUserId)));
}

export async function commentsView(postId: string) {
  const rows = await db
    .select({
      id: commentsTable.id,
      postId: commentsTable.postId,
      content: commentsTable.content,
      createdAt: commentsTable.createdAt,
      userName: usersTable.name,
      avatarUrl: usersTable.avatarUrl,
    })
    .from(commentsTable)
    .innerJoin(usersTable, eq(commentsTable.userId, usersTable.id))
    .where(eq(commentsTable.postId, postId))
    .orderBy(asc(commentsTable.createdAt));
  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
}