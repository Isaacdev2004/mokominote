import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const usersTable = pgTable(
  "mokominote_users",
  {
    id: text("id").primaryKey(),
    clerkId: text("clerk_id"),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash"),
    role: text("role").notNull().default("member"),
    avatarUrl: text("avatar_url"),
    bio: text("bio"),
    xpPoints: integer("xp_points").notNull().default(0),
    loyaltyPoints: integer("loyalty_points").notNull().default(0),
    status: text("status").notNull().default("active"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("mokominote_users_email_idx").on(table.email),
    uniqueIndex("mokominote_users_clerk_id_idx").on(table.clerkId),
    index("mokominote_users_role_idx").on(table.role),
  ],
);

export const categoriesTable = pgTable(
  "mokominote_categories",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (table) => [uniqueIndex("mokominote_categories_slug_idx").on(table.slug)],
);

export const businessesTable = pgTable(
  "mokominote_businesses",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull().references(() => usersTable.id),
    categoryId: text("category_id").notNull().references(() => categoriesTable.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull(),
    district: text("district").notNull(),
    village: text("village").notNull(),
    address: text("address"),
    phone: text("phone"),
    email: text("email"),
    website: text("website"),
    logoUrl: text("logo_url"),
    coverImageUrl: text("cover_image_url"),
    openingHours: jsonb("opening_hours").$type<Record<string, string>>().notNull().default({}),
    socialLinks: jsonb("social_links").$type<Record<string, string>>().notNull().default({}),
    status: text("status").notNull().default("pending"),
    verificationStatus: text("verification_status").notNull().default("unverified"),
    premiumTier: text("premium_tier").notNull().default("free"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("mokominote_businesses_slug_idx").on(table.slug),
    index("mokominote_businesses_owner_idx").on(table.ownerId),
    index("mokominote_businesses_category_idx").on(table.categoryId),
    index("mokominote_businesses_district_idx").on(table.district),
    index("mokominote_businesses_village_idx").on(table.village),
    index("mokominote_businesses_status_idx").on(table.status),
  ],
);

export const businessMembersTable = pgTable(
  "mokominote_business_members",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("mokominote_business_members_unique_idx").on(table.businessId, table.userId),
    index("mokominote_business_members_business_idx").on(table.businessId),
    index("mokominote_business_members_user_idx").on(table.userId),
  ],
);

export const postsTable = pgTable(
  "mokominote_posts",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id").notNull().references(() => businessesTable.id, { onDelete: "cascade" }),
    authorId: text("author_id").notNull().references(() => usersTable.id),
    type: text("type").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    imageUrl: text("image_url"),
    status: text("status").notNull().default("published"),
    ...timestamps,
  },
  (table) => [
    index("mokominote_posts_business_idx").on(table.businessId),
    index("mokominote_posts_created_idx").on(table.createdAt),
  ],
);

export const commentsTable = pgTable(
  "mokominote_comments",
  {
    id: text("id").primaryKey(),
    postId: text("post_id").notNull().references(() => postsTable.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => usersTable.id),
    content: text("content").notNull(),
    ...timestamps,
  },
  (table) => [index("mokominote_comments_post_idx").on(table.postId)],
);

export const reactionsTable = pgTable(
  "mokominote_reactions",
  {
    id: text("id").primaryKey(),
    postId: text("post_id").notNull().references(() => postsTable.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    type: text("type").notNull().default("like"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("mokominote_reactions_unique_idx").on(table.postId, table.userId, table.type),
    index("mokominote_reactions_post_idx").on(table.postId),
  ],
);

export const notificationsTable = pgTable(
  "mokominote_notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    read: boolean("read").notNull().default(false),
    href: text("href"),
    ...timestamps,
  },
  (table) => [
    index("mokominote_notifications_user_idx").on(table.userId),
    index("mokominote_notifications_read_idx").on(table.read),
  ],
);

export const analyticsEventsTable = pgTable(
  "mokominote_analytics_events",
  {
    id: text("id").primaryKey(),
    businessId: text("business_id").references(() => businessesTable.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => usersTable.id, { onDelete: "set null" }),
    type: text("type").notNull(),
    postId: text("post_id").references(() => postsTable.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    index("mokominote_analytics_business_idx").on(table.businessId),
    index("mokominote_analytics_type_idx").on(table.type),
    index("mokominote_analytics_created_idx").on(table.createdAt),
  ],
);

export const sessionsTable = pgTable(
  "mokominote_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("mokominote_sessions_token_idx").on(table.tokenHash),
    index("mokominote_sessions_user_idx").on(table.userId),
    index("mokominote_sessions_expires_idx").on(table.expiresAt),
  ],
);

export const passwordResetTokensTable = pgTable(
  "mokominote_password_reset_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("mokominote_password_reset_token_idx").on(table.tokenHash),
    index("mokominote_password_reset_user_idx").on(table.userId),
  ],
);

export const auditLogsTable = pgTable(
  "mokominote_audit_logs",
  {
    id: text("id").primaryKey(),
    actorId: text("actor_id").references(() => usersTable.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
  },
  (table) => [
    index("mokominote_audit_actor_idx").on(table.actorId),
    index("mokominote_audit_action_idx").on(table.action),
    index("mokominote_audit_created_idx").on(table.createdAt),
  ],
);

export const transactionsTable = pgTable(
  "mokominote_transactions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => usersTable.id, { onDelete: "set null" }),
    businessId: text("business_id").references(() => businessesTable.id, { onDelete: "set null" }),
    provider: text("provider").notNull().default("dev"),
    providerTransactionId: text("provider_transaction_id"),
    type: text("type").notNull(),
    amount: integer("amount").notNull().default(0),
    currency: text("currency").notNull().default("MUR"),
    status: text("status").notNull().default("pending"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("mokominote_transactions_provider_idx").on(table.provider, table.providerTransactionId),
    index("mokominote_transactions_user_idx").on(table.userId),
    index("mokominote_transactions_business_idx").on(table.businessId),
    index("mokominote_transactions_status_idx").on(table.status),
  ],
);

export type User = typeof usersTable.$inferSelect;
export type Category = typeof categoriesTable.$inferSelect;
export type Business = typeof businessesTable.$inferSelect;
export type Post = typeof postsTable.$inferSelect;
export type Session = typeof sessionsTable.$inferSelect;
export type Transaction = typeof transactionsTable.$inferSelect;