import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  businessMembersTable,
  businessesTable,
  categoriesTable,
  commentsTable,
  postsTable,
  usersTable,
} from "@workspace/db";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

/** Development-only seed password. Never use in production. */
export const DEV_SEED_PASSWORD = "DevPass123!";

const categorySeed = [
  ["cat-food", "Food & Drink", "food-drink", "Restaurants, cafés, bakeries, and local food makers."],
  ["cat-wellness", "Wellness & Beauty", "wellness-beauty", "Wellness studios, salons, and personal care."],
  ["cat-home", "Home & Living", "home-living", "Home services, interiors, and everyday essentials."],
  ["cat-retail", "Retail & Shopping", "retail-shopping", "Independent shops, makers, and local retail."],
  ["cat-services", "Professional Services", "professional-services", "Trusted local experts and business services."],
  ["cat-experiences", "Experiences & Leisure", "experiences-leisure", "Activities, events, and memorable days out."],
  ["cat-health", "Health & Medical", "health-medical", "Clinics, pharmacies, and community health services."],
  ["cat-education", "Education & Training", "education-training", "Schools, tutors, and skills programmes."],
  ["cat-auto", "Automotive", "automotive", "Garages, parts, and vehicle care."],
  ["cat-agriculture", "Agriculture", "agriculture", "Farms, growers, and island produce."],
  ["cat-construction", "Construction & Trades", "construction-trades", "Builders, artisans, and repair trades."],
  ["cat-tech", "Technology", "technology", "Digital services, repairs, and local tech."],
] as const;

const userSeed = [
  ["user-asha", "Asha Ramdass", "asha@mokominote.dev", "owner"],
  ["user-noah", "Noah Pillay", "noah@mokominote.dev", "owner"],
  ["user-leila", "Leila Mootoosamy", "leila@mokominote.dev", "member"],
  ["user-admin", "MoKominoté Admin", "admin@mokominote.dev", "admin"],
] as const;

const openingHours = {
  monday: "07:30 – 17:00",
  tuesday: "07:30 – 17:00",
  wednesday: "07:30 – 17:00",
  thursday: "07:30 – 17:00",
  friday: "07:30 – 18:00",
  saturday: "08:00 – 14:00",
  sunday: "Closed",
};

const businessSeed = [
  ["biz-cafe-koa", "user-asha", "cat-food", "Café Koa", "cafe-koa", "A sunlit neighborhood café serving island-grown coffee, flaky viennoiserie, and slow mornings.", "Port Louis", "Caudan", "15 Sir William Newton Street", "+230 211 4400", "hello@cafekoa.mu", "https://cafekoa.example"],
  ["biz-atelier-lune", "user-noah", "cat-wellness", "Atelier Lune", "atelier-lune", "A calm studio for considered skincare, brows, and small rituals that make the week feel lighter.", "Plaines Wilhems", "Quatre Bornes", "8 Saint Jean Road", "+230 466 2210", "studio@atelierlune.mu", "https://atelierlune.example"],
  ["biz-papier-maison", "user-asha", "cat-home", "Papier Maison", "papier-maison", "Thoughtful paper goods and locally made objects for homes, desks, and the people you want to remember.", "Moka", "Moka", "La Piazza, Moka", "+230 433 1188", "hello@papiermaison.mu", "https://papiermaison.example"],
  ["biz-tide-and-trail", "user-noah", "cat-experiences", "Tide & Trail", "tide-and-trail", "Small-group coastal adventures that help visitors and locals see more of Mauritius together.", "Black River", "Tamarin", "Royal Road, Tamarin", "+230 483 9090", "go@tideandtrail.mu", "https://tideandtrail.example"],
] as const;

const postSeed = [
  ["post-koa-weekend", "biz-cafe-koa", "user-asha", "announcement", "Your weekend, poured slowly", "We are opening early this Saturday with a new single-origin pour-over from Chamarel. Come by for the first cup and stay for the sea breeze."],
  ["post-koa-lunch", "biz-cafe-koa", "user-asha", "deal", "A little something for the table", "Join our community this month and enjoy a complimentary house-made cookie with any two drinks, Monday to Thursday."],
  ["post-lune-reset", "biz-atelier-lune", "user-noah", "event", "The Sunday Reset", "A small-group afternoon of guided skincare, tea, and a little quiet. Places are limited—message the studio to reserve your spot."],
  ["post-papier-new", "biz-papier-maison", "user-asha", "announcement", "Made for the everyday", "Our new desk collection has arrived: undated planners, linen notebooks, and the kind of pen you keep reaching for."],
  ["post-tide-sunset", "biz-tide-and-trail", "user-noah", "event", "Sunset on the west coast", "Our next coastal walk leaves Tamarin at 16:30. Bring water, comfortable shoes, and a camera if you have one."],
] as const;

async function seed() {
  const passwordHash = await hashPassword(DEV_SEED_PASSWORD);
  for (const [id, name, slug, description] of categorySeed) {
    await db.insert(categoriesTable).values({ id, name, slug, description, active: true }).onConflictDoNothing();
  }
  for (const [id, name, email, role] of userSeed) {
    await db.insert(usersTable).values({ id, name, email, role, status: "active", passwordHash }).onConflictDoNothing();
    await db.update(usersTable).set({ passwordHash, updatedAt: new Date() }).where(eq(usersTable.id, id));
  }
  for (const [id, ownerId, categoryId, name, slug, description, district, village, address, phone, email, website] of businessSeed) {
    await db.insert(businessesTable).values({
      id,
      ownerId,
      categoryId,
      name,
      slug,
      description,
      district,
      village,
      address,
      phone,
      email,
      website,
      openingHours,
      socialLinks: { instagram: "https://instagram.com/mokominote", facebook: "https://facebook.com/mokominote" },
      status: "approved",
      verificationStatus: "verified",
      premiumTier: "free",
    }).onConflictDoNothing();
  }
  for (const [id, businessId, authorId, type, title, content] of postSeed) {
    await db.insert(postsTable).values({ id, businessId, authorId, type, title, content, status: "published" }).onConflictDoNothing();
  }
  await db.insert(businessMembersTable).values([
    { id: "member-koa-leila", businessId: "biz-cafe-koa", userId: "user-leila" },
    { id: "member-lune-leila", businessId: "biz-atelier-lune", userId: "user-leila" },
  ]).onConflictDoNothing();
  await db.insert(commentsTable).values({
    id: "comment-koa-leila",
    postId: "post-koa-weekend",
    userId: "user-leila",
    content: "This sounds like the perfect Saturday start.",
  }).onConflictDoNothing();
  console.log("Seed complete. Development logins (never use in production):");
  console.log("  admin@mokominote.dev / DevPass123!");
  console.log("  asha@mokominote.dev / DevPass123!");
  console.log("  noah@mokominote.dev / DevPass123!");
  console.log("  leila@mokominote.dev / DevPass123!");
}

seed().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});
