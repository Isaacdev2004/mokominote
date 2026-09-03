import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearch } from "wouter";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  Clock3,
  ExternalLink,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  Store,
  Tag,
} from "lucide-react";
import {
  getGetBusinessQueryKey,
  getListBusinessesQueryKey,
  getListCategoriesQueryKey,
  useGetBusiness,
  useHealthCheck,
  useJoinBusiness,
  useListBusinesses,
  useListCategories,
} from "@workspace/api-client-react";
import { useCommunityFeed } from "@workspace/api-client-react";
import { AppShell } from "@/components/layout";
import { BusinessCard, PostCard } from "@/components/cards";
import { Button, EmptyState, ErrorState, LoadingPage, SectionHeading, SkeletonBlock } from "@/components/kit";
import { DISTRICTS } from "@/lib/constants";
import { compactNumber, initials, setPageMeta } from "@/lib/format";
import { useDebouncedValue } from "@/hooks/use-debounce";

export function Home() {
  const categories = useListCategories({ query: { queryKey: getListCategoriesQueryKey() } });
  const businesses = useListBusinesses({ sort: "active", page: 1, pageSize: 6 }, { query: { queryKey: getListBusinessesQueryKey({ sort: "active", page: 1, pageSize: 6 }) } });
  const feed = useCommunityFeed(1);
  const { data: health } = useHealthCheck({ query: { queryKey: ["/api/healthz"], retry: false } });
  const items = businesses.data?.items || [];

  useEffect(() => {
    setPageMeta("MoKominoté — Discover local. Connect community.", "A community-driven local business directory for Mauritius.");
  }, []);

  return (
    <AppShell>
      <main>
        <section className="relative overflow-hidden border-b border-[hsl(var(--border))]">
          <div className="absolute right-[-8%] top-[-35%] h-[620px] w-[620px] rounded-full bg-[hsl(var(--secondary))]/25 blur-3xl" />
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-20 lg:grid-cols-[1.1fr_.9fr] lg:px-8 lg:py-28">
            <div className="page-enter relative">
              <p className="mono-font mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-[hsl(var(--accent))]">
                <span className="h-2 w-2 rounded-full bg-[hsl(var(--accent))]" /> Discover local. Connect community.
              </p>
              <h1 className="display-font max-w-3xl text-6xl font-bold leading-[.95] tracking-[-.06em] sm:text-7xl lg:text-[6.8rem]">
                Find the good<br /><span className="text-[hsl(var(--accent))]">close to home.</span>
              </h1>
              <p className="mt-7 max-w-lg text-lg leading-8 text-[hsl(var(--muted-foreground))]">
                MoKominoté helps Mauritius discover independent businesses and stay close to the communities around them.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/businesses" className="group inline-flex items-center gap-3 rounded-full bg-[hsl(var(--primary))] px-6 py-3.5 font-bold text-[hsl(var(--primary-foreground))] transition hover:-translate-y-1 hover:shadow-xl">
                  <Search size={18} /> Explore businesses <ArrowRight className="transition group-hover:translate-x-1" size={17} />
                </Link>
                <Link href="/register" className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] px-6 py-3.5 font-bold transition hover:border-[hsl(var(--primary))]">
                  List your business
                </Link>
              </div>
              <p className="mono-font mt-8 text-[10px] uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
                {health?.status === "ok" ? "Island network online" : "A community directory for Mauritius"}
              </p>
            </div>
            <div className="relative page-enter stagger-2">
              <div className="relative mx-auto aspect-[.9] max-w-md rotate-2 rounded-[2.5rem] bg-[hsl(var(--primary))] p-5 shadow-2xl">
                <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-[1.8rem] bg-[#e7c879] p-6">
                  <span className="mono-font text-[10px] font-bold uppercase tracking-widest">Today, on the island</span>
                  <p className="display-font max-w-xs text-4xl font-bold leading-none">A better way to neighbour.</p>
                  <div className="rounded-2xl bg-[hsl(var(--card))]/70 p-4 backdrop-blur">
                    <p className="text-sm font-bold">Join a kominoté</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Follow local places, then stay close to what they share next.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8" id="discover">
          <SectionHeading eyebrow="Browse by rhythm" title="Your kind of local." body="From the morning cup to the thing you’ve been meaning to fix, start somewhere familiar." action={<Link href="/businesses" className="group flex items-center gap-2 text-sm font-bold">See all <ArrowRight size={16} /></Link>} />
          {categories.isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><SkeletonBlock className="h-28" /><SkeletonBlock className="h-28" /><SkeletonBlock className="h-28" /><SkeletonBlock className="h-28" /></div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(categories.data || []).slice(0, 8).map((category, index) => (
                <Link href={`/businesses?category=${category.slug}`} key={category.id} className={`group rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 transition hover:-translate-y-1 hover:border-[hsl(var(--primary))] ${index === 0 ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]" : ""}`}>
                  <div className="mb-6 flex items-start justify-between">
                    <span className="text-2xl font-bold">{String(index + 1).padStart(2, "0")}</span>
                    <ArrowRight size={17} />
                  </div>
                  <p className="font-bold">{category.name}</p>
                  <p className={`mt-1 text-xs ${index === 0 ? "text-[hsl(var(--primary-foreground))]/70" : "text-[hsl(var(--muted-foreground))]"}`}>{category.businessCount} places</p>
                </Link>
              ))}
            </div>
          )}
        </section>
        <section className="bg-[hsl(var(--primary))] px-5 py-20 text-[hsl(var(--primary-foreground))] lg:px-8" id="community">
          <div className="mx-auto max-w-7xl">
            <SectionHeading eyebrow="Worth the detour" title="Good places, properly introduced." body="A living pulse of businesses that make the island feel like itself." action={<Link href="/businesses" className="rounded-full bg-[hsl(var(--secondary))] px-5 py-3 text-sm font-bold text-[hsl(var(--secondary-foreground))]">Discover more</Link>} />
            {items.length ? <div className="grid gap-4 md:grid-cols-3">{items.slice(0, 3).map((business, index) => <BusinessCard key={business.id} business={business} featured={index === 0} />)}</div> : <EmptyState title="New local places are joining every day." body="Check back soon, or be the first to list your business." />}
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <SectionHeading eyebrow="How it works" title="Discover. Connect. Engage." />
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["01", "Discover", "Search the island’s independent shops, makers, and services by category and place."],
              ["02", "Connect", "Join a business community and keep their updates close, without chasing every channel."],
              ["03", "Engage", "React, comment, and show up for the offers, events, and everyday notes that matter."],
            ].map(([step, title, body]) => (
              <div key={step} className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
                <p className="mono-font text-xs font-bold text-[hsl(var(--accent))]">{step}</p>
                <h3 className="display-font mt-3 text-2xl font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{body}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="mx-auto grid max-w-7xl gap-8 px-5 pb-20 lg:grid-cols-2 lg:px-8">
          <div className="rounded-3xl bg-[hsl(var(--secondary))] p-8">
            <Store className="mb-8" />
            <h2 className="display-font text-3xl font-bold">For business owners</h2>
            <p className="mt-3 max-w-md text-sm leading-6">Become discoverable, publish announcements, deals, and events, and see who is joining your community.</p>
            <Link href="/register" className="mt-6 inline-flex font-bold underline">List your business</Link>
          </div>
          <div>
            <SectionHeading eyebrow="Community" title="What’s moving locally" action={<Link href="/community" className="text-sm font-bold underline">Open the feed</Link>} />
            <div className="space-y-4">
              {(feed.data?.items || []).slice(0, 2).map((post) => <PostCard key={post.id} post={post} />)}
              {!feed.data?.items?.length && <EmptyState title="Quiet for now." body="Community posts will appear here as businesses publish." />}
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  );
}

export function Directory() {
  const searchString = useSearch();
  const initial = useMemo(() => new URLSearchParams(searchString), [searchString]);
  const [search, setSearch] = useState(initial.get("search") || "");
  const [category, setCategory] = useState(initial.get("category") || "");
  const [district, setDistrict] = useState(initial.get("district") || "");
  const [village, setVillage] = useState(initial.get("village") || "");
  const [sort, setSort] = useState<"newest" | "members" | "active">((initial.get("sort") as "newest" | "members" | "active") || "active");
  const [page, setPage] = useState(Number(initial.get("page") || 1));
  const debouncedSearch = useDebouncedValue(search, 350);
  const params = useMemo(
    () => ({ search: debouncedSearch || undefined, category: category || undefined, district: district || undefined, village: village || undefined, sort, page, pageSize: 12 }),
    [debouncedSearch, category, district, village, sort, page],
  );
  const query = useListBusinesses(params, { query: { queryKey: getListBusinessesQueryKey(params), placeholderData: (previous) => previous } });
  const categories = useListCategories({ query: { queryKey: getListCategoriesQueryKey() } });
  const totalPages = Math.max(1, Math.ceil((query.data?.total || 0) / 12));

  useEffect(() => {
    setPageMeta("Directory — MoKominoté", "Search and filter local businesses across Mauritius.");
  }, []);

  return (
    <AppShell>
      <main className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
        <p className="mono-font text-xs font-bold uppercase tracking-[0.22em] text-[hsl(var(--accent))]">The directory</p>
        <h1 className="display-font mt-3 text-5xl font-bold tracking-tight sm:text-6xl">Find your next<br /><span className="text-[hsl(var(--accent))]">favourite.</span></h1>
        <div className="mt-10 rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 shadow-sm">
          <div className="flex items-center gap-3 rounded-2xl bg-[hsl(var(--muted))] px-4 py-1">
            <Search className="text-[hsl(var(--muted-foreground))]" size={21} />
            <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search a business, service, or place..." className="h-12 flex-1 bg-transparent text-sm outline-none" />
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            <select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }} className="h-11 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-sm font-semibold">
              <option value="">Every category</option>
              {(categories.data || []).map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}
            </select>
            <select value={district} onChange={(event) => { setDistrict(event.target.value); setPage(1); }} className="h-11 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-sm font-semibold">
              <option value="">Every district</option>
              {DISTRICTS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <input value={village} onChange={(event) => { setVillage(event.target.value); setPage(1); }} placeholder="Village" className="h-11 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-sm font-semibold outline-none" />
            <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="h-11 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 text-sm font-semibold">
              <option value="active">Most active</option>
              <option value="newest">Newest</option>
              <option value="members">Most joined</option>
            </select>
          </div>
        </div>
        <p className="mt-8 text-sm font-semibold text-[hsl(var(--muted-foreground))]">{query.data?.total ?? 0} local businesses</p>
        {query.isLoading ? (
          <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3"><SkeletonBlock className="h-80" /><SkeletonBlock className="h-80" /><SkeletonBlock className="h-80" /></div>
        ) : query.isError ? (
          <div className="mt-5"><ErrorState retry={() => query.refetch()} /></div>
        ) : query.data?.items?.length ? (
          <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{query.data.items.map((business) => <BusinessCard key={business.id} business={business} />)}</div>
        ) : (
          <div className="mt-5"><EmptyState title="No businesses found" body="Try a wider search or browse every category." action={<Button variant="outline" onClick={() => { setSearch(""); setCategory(""); setDistrict(""); setVillage(""); }}>Clear filters</Button>} /></div>
        )}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button>
            <span className="text-sm font-bold">Page {page} of {totalPages}</span>
            <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Next</Button>
          </div>
        )}
      </main>
    </AppShell>
  );
}

export function BusinessProfile() {
  const { slug = "" } = useParams<{ slug: string }>();
  const query = useGetBusiness(slug, { query: { queryKey: getGetBusinessQueryKey(slug) } });
  const join = useJoinBusiness();
  const [joined, setJoined] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"posts" | "deals" | "events" | "about">("posts");

  useEffect(() => {
    if (query.data) setPageMeta(`${query.data.name} — MoKominoté`, query.data.description);
  }, [query.data]);

  if (query.isLoading) return <AppShell><LoadingPage /></AppShell>;
  if (query.isError || !query.data) return <AppShell><main className="mx-auto max-w-3xl px-5 py-16"><ErrorState retry={() => query.refetch()} title="This listing isn’t available." /></main></AppShell>;

  const business = query.data;
  const isMember = joined ?? business.isMember;
  const posts = (business.posts || []).filter((post) => {
    if (tab === "deals") return post.type === "deal";
    if (tab === "events") return post.type === "event";
    return true;
  });

  return (
    <AppShell>
      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        <Link href="/businesses" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[hsl(var(--muted-foreground))]"><ChevronLeft size={17} /> Back to directory</Link>
        <section className="relative overflow-hidden rounded-[2rem] bg-[hsl(var(--primary))] p-6 text-[hsl(var(--primary-foreground))] sm:p-10">
          {business.coverImageUrl && <img src={business.coverImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />}
          <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
            <div>
              <div className="mb-6 flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl bg-[hsl(var(--secondary))] text-2xl font-bold text-[hsl(var(--primary))]">
                {business.logoUrl ? <img src={business.logoUrl} alt="" className="h-full w-full object-cover" /> : initials(business.name)}
              </div>
              <p className="mono-font text-xs font-bold uppercase tracking-widest text-[hsl(var(--secondary))]">{business.category.name}</p>
              <h1 className="display-font mt-2 text-5xl font-bold tracking-tight sm:text-6xl">{business.name}</h1>
              <p className="mt-3 max-w-2xl text-[hsl(var(--primary-foreground))]/75">{business.description}</p>
              {business.verificationStatus === "verified" && <p className="mt-3 inline-flex items-center gap-2 text-sm font-bold"><ShieldCheck size={16} /> Verified listing</p>}
            </div>
            <Button variant="accent" disabled={join.isPending} onClick={() => join.mutate({ id: business.id }, { onSuccess: (result) => setJoined(result.joined) })}>
              {isMember ? <Check size={17} /> : <Plus size={17} />}
              {isMember ? "Joined community" : "Join Kominoté"}
            </Button>
          </div>
        </section>
        <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {(["posts", "deals", "events", "about"] as const).map((item) => (
                <button key={item} onClick={() => setTab(item)} className={`rounded-full px-4 py-2 text-sm font-bold capitalize ${tab === item ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]" : "border border-[hsl(var(--border))]"}`}>{item}</button>
              ))}
            </div>
            {tab === "about" ? (
              <div className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
                <h2 className="display-font text-2xl font-bold">About {business.name}</h2>
                <p className="mt-3 leading-7 text-[hsl(var(--muted-foreground))]">{business.description}</p>
              </div>
            ) : posts.length ? (
              <div className="space-y-4">{posts.map((post) => <PostCard key={post.id} post={post} />)}</div>
            ) : (
              <EmptyState title="No community posts yet" body="This community hasn’t posted an update in this section." />
            )}
          </div>
          <aside className="space-y-4">
            <div className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
              <h2 className="display-font text-xl font-bold">Visit details</h2>
              <div className="mt-5 space-y-4 text-sm">
                <p className="flex gap-3"><MapPin size={17} className="shrink-0 text-[hsl(var(--accent))]" /><span>{business.address || business.village}, {business.district}</span></p>
                {business.phone && <p className="flex gap-3"><Tag size={17} className="shrink-0 text-[hsl(var(--accent))]" /><a href={`tel:${business.phone}`} className="font-bold underline">{business.phone}</a></p>}
                {business.website && <p className="flex gap-3"><ExternalLink size={17} className="shrink-0 text-[hsl(var(--accent))]" /><a href={business.website} target="_blank" rel="noreferrer" className="font-bold underline">Visit website</a></p>}
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Google Maps can be connected when a map API key is configured.</p>
              </div>
            </div>
            <div className="rounded-3xl bg-[hsl(var(--secondary))] p-6">
              <Clock3 className="mb-8" />
              <h2 className="display-font text-xl font-bold">Opening hours</h2>
              <div className="mt-4 space-y-2 text-sm">
                {Object.keys(business.openingHours || {}).length ? Object.entries(business.openingHours).map(([day, hours]) => (
                  <div className="flex justify-between gap-3" key={day}><span className="capitalize">{day}</span><span className="font-bold">{hours}</span></div>
                )) : <p>Hours coming soon.</p>}
              </div>
            </div>
            {Object.keys(business.socialLinks || {}).length > 0 && (
              <div className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
                <h2 className="display-font text-xl font-bold">Social</h2>
                <div className="mt-4 grid gap-2 text-sm font-bold">
                  {Object.entries(business.socialLinks).map(([network, href]) => href ? <a key={network} href={href} className="capitalize underline" target="_blank" rel="noreferrer">{network}</a> : null)}
                </div>
              </div>
            )}
            <p className="text-sm font-semibold text-[hsl(var(--muted-foreground))]">{compactNumber(business.memberCount)} members in this kominoté</p>
          </aside>
        </div>
      </main>
    </AppShell>
  );
}

export function CommunityPage() {
  const feed = useCommunityFeed(1);
  useEffect(() => { setPageMeta("Community — MoKominoté"); }, []);
  return (
    <AppShell>
      <main className="mx-auto max-w-3xl px-5 py-12 lg:px-8">
        <SectionHeading eyebrow="The island feed" title="Community" body="Announcements, deals, and events from approved local businesses." />
        {feed.isLoading ? <LoadingPage /> : feed.data?.items?.length ? <div className="space-y-4">{feed.data.items.map((post) => <PostCard key={post.id} post={post} />)}</div> : <EmptyState title="No community posts yet" body="When businesses publish, their updates will land here." />}
      </main>
    </AppShell>
  );
}

export function StaticPage({ title, body }: { title: string; body: string }) {
  useEffect(() => { setPageMeta(`${title} — MoKominoté`); }, [title]);
  return (
    <AppShell>
      <main className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="display-font text-5xl font-bold">{title}</h1>
        <p className="mt-6 text-lg leading-8 text-[hsl(var(--muted-foreground))]">{body}</p>
      </main>
    </AppShell>
  );
}

export function NotFoundPage() {
  return (
    <AppShell>
      <main className="mx-auto flex min-h-[65vh] max-w-2xl flex-col items-center justify-center px-5 text-center">
        <p className="mono-font text-xs font-bold uppercase tracking-widest text-[hsl(var(--accent))]">404 · Wrong turn</p>
        <h1 className="display-font mt-4 text-6xl font-bold">This place isn’t on the map.</h1>
        <Link href="/" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-5 py-3 font-bold text-[hsl(var(--primary-foreground))]">Back to home <ArrowRight size={16} /></Link>
      </main>
    </AppShell>
  );
}
