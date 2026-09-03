import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Bell, Building2, Clock3, Heart, LockKeyhole, MessageCircle, Plus, Settings2, Store, Users, Zap } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getGetAdminDashboardQueryKey,
  getGetBusinessDashboardQueryKey,
  getGetCurrentUserQueryKey,
  getGetMemberDashboardQueryKey,
  getListAdminBusinessesQueryKey,
  getListAdminUsersQueryKey,
  getListBusinessMembersQueryKey,
  getListCategoriesQueryKey,
  getListNotificationsQueryKey,
  useCreateBusiness,
  useCreatePost,
  useDeletePost,
  useGetAdminDashboard,
  useGetBusinessDashboard,
  useGetCurrentUser,
  useGetMemberDashboard,
  useListAdminBusinesses,
  useListAdminUsers,
  useListBusinessMembers,
  useListBusinessPosts,
  useListCategories,
  useListNotifications,
  useMarkNotificationRead,
  useUpdateBusiness,
  useUpdateBusinessStatus,
  useUpdateUserStatus,
} from "@workspace/api-client-react";
import {
  useAdminPosts,
  useCreateCheckout,
  useMarkAllNotificationsRead,
  usePaymentProducts,
  useUpdateAdminPostStatus,
  useUpdateProfile,
  useUploadImage,
} from "@workspace/api-client-react";
import { DashboardFrame } from "@/components/layout";
import { PostCard } from "@/components/cards";
import { Button, EmptyState, ErrorState, Input, LoadingPage, PendingSpinner, SavedBanner, SectionHeading, StatCard } from "@/components/kit";
import { DISTRICTS, WEEKDAYS } from "@/lib/constants";
import { compactNumber, dateLabel, money, setPageMeta } from "@/lib/format";
import type { BusinessUpdate, ListAdminBusinessesParams, ListAdminBusinessesStatus, ListAdminUsersParams, ListAdminUsersRole, ListAdminUsersStatus, PostInputType } from "@workspace/api-client-react";

export function MemberDashboard() {
  const query = useGetMemberDashboard({ query: { queryKey: getGetMemberDashboardQueryKey() } });
  useEffect(() => { setPageMeta("My home — MoKominoté"); }, []);
  if (query.isLoading) return <DashboardFrame title="My home"><LoadingPage /></DashboardFrame>;
  if (query.isError || !query.data) return <DashboardFrame title="My home"><ErrorState retry={() => query.refetch()} /></DashboardFrame>;
  const data = query.data;
  return (
    <DashboardFrame title="My home" kicker="Member dashboard">
      <div className="rounded-[2rem] bg-[hsl(var(--primary))] p-7 text-[hsl(var(--primary-foreground))] sm:p-10">
        <p className="mono-font text-xs uppercase tracking-widest text-[hsl(var(--secondary))]">Your island, your pace</p>
        <h2 className="display-font mt-3 text-4xl font-bold">Keep close to what matters.</h2>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Joined" value={data.stats.businessesJoined} note="communities" icon={Users} tone="yellow" />
        <StatCard label="Loved" value={data.stats.postsLiked} note="posts liked" icon={Heart} />
        <StatCard label="Added" value={data.stats.commentsMade} note="thoughts shared" icon={MessageCircle} tone="coral" />
      </div>
      <div className="mt-12 grid gap-8 lg:grid-cols-[1.15fr_.85fr]">
        <div>
          <SectionHeading eyebrow="Your places" title="Communities you’re in" action={<Link href="/businesses" className="text-sm font-bold underline">Find more</Link>} />
          {data.joinedBusinesses?.length ? data.joinedBusinesses.map((business) => (
            <Link href={`/businesses/${business.slug}`} className="mb-3 flex items-center gap-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4" key={business.id}>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{business.name}</p>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">{business.village} · {business.category.name}</p>
              </div>
              <ArrowRight size={17} />
            </Link>
          )) : <EmptyState title="Your circle is waiting." body="Join a business to start seeing its updates here." />}
        </div>
        <div>
          <SectionHeading eyebrow="Recent notes" title="Fresh from local" />
          {data.recentPosts?.length ? data.recentPosts.slice(0, 3).map((post) => <div className="mb-4" key={post.id}><PostCard post={post} /></div>) : <EmptyState title="No community posts yet" body="Your joined communities will show up here." />}
        </div>
      </div>
    </DashboardFrame>
  );
}

export function MemberProfilePage() {
  const { data: user } = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey(), retry: false } });
  const update = useUpdateProfile();
  const upload = useUploadImage();
  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (user) { setName(user.name); setBio(user.bio || ""); } }, [user]);
  useEffect(() => { setPageMeta("Your profile — MoKominoté"); }, []);
  return (
    <DashboardFrame title="Your profile">
      <form
        className="max-w-xl space-y-4 rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6"
        onSubmit={(event) => {
          event.preventDefault();
          update.mutate({ name, bio }, { onSuccess: () => setSaved(true) });
        }}
      >
        <Input label="Name" value={name} onChange={setName} required />
        <Input label="Bio" value={bio} onChange={setBio} textarea />
        <label className="block text-sm font-semibold">
          Avatar
          <input
            type="file"
            accept="image/*"
            className="mt-2 block"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const dataUrl = await fileToDataUrl(file);
              const stored = await upload.mutateAsync({ kind: "avatar", dataUrl });
              update.mutate({ avatarUrl: stored.url });
            }}
          />
        </label>
        {saved && <SavedBanner>Profile saved.</SavedBanner>}
        <Button type="submit" disabled={update.isPending}><PendingSpinner pending={update.isPending} /> Save</Button>
      </form>
    </DashboardFrame>
  );
}

export function BusinessDashboard() {
  const query = useGetBusinessDashboard({ query: { queryKey: getGetBusinessDashboardQueryKey(), retry: false } });
  const members = useListBusinessMembers(query.data?.business?.id || "", { query: { queryKey: getListBusinessMembersQueryKey(query.data?.business?.id || ""), enabled: !!query.data?.business?.id } });
  useEffect(() => { setPageMeta("Business studio — MoKominoté"); }, []);
  if (query.isLoading) return <DashboardFrame title="Overview" owner><LoadingPage /></DashboardFrame>;
  if (query.isError || !query.data) {
    return (
      <DashboardFrame title="Overview" owner>
        <EmptyState title="Put your business on the map." body="Create a profile to unlock analytics, posts, and your public listing." action={<Link href="/dashboard/business/profile" className="font-bold underline">Create business</Link>} />
      </DashboardFrame>
    );
  }
  const data = query.data;
  const maxViews = Math.max(...(data.analytics || []).map((item) => item.views), 1);
  return (
    <DashboardFrame title="Overview" kicker="Business studio" owner>
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Here’s the pulse for</p>
          <h2 className="display-font mt-1 text-4xl font-bold">{data.business.name}</h2>
          <p className="mt-2 text-xs font-bold uppercase tracking-widest">{data.business.status}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/business/profile" className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-bold text-[hsl(var(--primary-foreground))]"><Settings2 size={16} /> Edit business</Link>
          <Link href="/dashboard/business/posts" className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] px-4 py-2.5 text-sm font-bold">Create post</Link>
        </div>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Profile views" value={compactNumber(data.stats.profileViews)} icon={Store} />
        <StatCard label="Members" value={data.stats.members} icon={Users} tone="yellow" />
        <StatCard label="Engagement" value={data.stats.engagement} icon={Zap} tone="coral" />
        <StatCard label="Published posts" value={data.stats.publishedPosts} icon={MessageCircle} />
      </div>
      <div className="mt-8 grid gap-5 lg:grid-cols-[1.4fr_.6fr]">
        <div className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          <h3 className="display-font text-2xl font-bold">Your last days</h3>
          {(data.analytics || []).length ? (
            <div className="mt-8 flex h-44 items-end gap-2">
              {(data.analytics || []).map((item) => (
                <div className="flex flex-1 flex-col items-center gap-2" key={item.date}>
                  <div className="w-full rounded-t-xl bg-[hsl(var(--primary))]" style={{ height: `${Math.max(8, (item.views / maxViews) * 100)}%` }} />
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))]">{dateLabel(item.date)}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No analytics data available yet" body="Views, joins, and engagement will appear here as people find you." />
          )}
        </div>
        <div className="rounded-3xl bg-[hsl(var(--secondary))] p-6">
          <Users className="mb-9" />
          <h3 className="display-font text-3xl font-bold">{members.data?.length ?? data.stats.members}</h3>
          <p className="mt-1 text-sm">people have chosen to stay close.</p>
        </div>
      </div>
      <div className="mt-8">
        <SectionHeading eyebrow="Activity" title="Recent movement" />
        {data.recentActivity?.length ? data.recentActivity.map((item) => (
          <div className="flex gap-4 border-b border-[hsl(var(--border))] p-5" key={item.id}>
            <div>
              <p className="font-bold">{item.label}</p>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">{item.description}</p>
            </div>
            <span className="ml-auto text-xs">{dateLabel(item.createdAt)}</span>
          </div>
        )) : <EmptyState title="Your activity is just starting." body="Publish an update to give your community something to respond to." />}
      </div>
    </DashboardFrame>
  );
}

export function OwnerProfile() {
  const ownedQuery = useGetBusinessDashboard({ query: { queryKey: getGetBusinessDashboardQueryKey(), retry: false } });
  const update = useUpdateBusiness();
  const create = useCreateBusiness();
  const upload = useUploadImage();
  const categories = useListCategories({ query: { queryKey: getListCategoriesQueryKey() } });
  const business = ownedQuery.data?.business;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [district, setDistrict] = useState("");
  const [village, setVillage] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [hours, setHours] = useState<Record<string, string>>({});
  const [social, setSocial] = useState({ facebook: "", instagram: "", linkedin: "", whatsapp: "" });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!business) return;
    setName(business.name);
    setDescription(business.description);
    setDistrict(business.district);
    setVillage(business.village);
    setCategoryId(business.category.id);
    setPhone(business.phone || "");
    setAddress(business.address || "");
    setEmail(business.email || "");
    setWebsite(business.website || "");
    setLogoUrl(business.logoUrl || "");
    setCoverImageUrl(business.coverImageUrl || "");
  }, [business]);

  const payload = {
    name,
    description,
    district,
    village,
    categoryId,
    phone,
    address,
    email: email || undefined,
    website: website || undefined,
    logoUrl: logoUrl || undefined,
    coverImageUrl: coverImageUrl || undefined,
    openingHours: hours,
    socialLinks: social,
  };

  return (
    <DashboardFrame title="Your profile" kicker="Business studio" owner>
      <form
        className="max-w-3xl space-y-5 rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-8"
        onSubmit={(event) => {
          event.preventDefault();
          if (business) update.mutate({ id: business.id, data: payload as BusinessUpdate }, { onSuccess: () => setSaved(true) });
          else create.mutate({ data: payload as BusinessUpdate }, { onSuccess: () => setSaved(true) });
        }}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Input label="Business name" value={name} onChange={setName} required />
          <label className="block space-y-1.5 text-sm font-semibold">
            Category
            <select required value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="mt-1.5 h-12 w-full rounded-2xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-4">
              <option value="">Choose a category</option>
              {(categories.data || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
        </div>
        <Input label="Description" value={description} onChange={setDescription} textarea required />
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block space-y-1.5 text-sm font-semibold">
            District
            <select required value={district} onChange={(event) => setDistrict(event.target.value)} className="mt-1.5 h-12 w-full rounded-2xl border px-4">
              <option value="">Choose a district</option>
              {DISTRICTS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <Input label="Village" value={village} onChange={setVillage} required />
        </div>
        <Input label="Address" value={address} onChange={setAddress} />
        <div className="grid gap-5 sm:grid-cols-2">
          <Input label="Phone" value={phone} onChange={setPhone} />
          <Input label="Email" type="email" value={email} onChange={setEmail} />
        </div>
        <Input label="Website" value={website} onChange={setWebsite} />
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-semibold">Logo<input type="file" accept="image/*" className="mt-2 block" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; const stored = await upload.mutateAsync({ kind: "logo", dataUrl: await fileToDataUrl(file) }); setLogoUrl(stored.url); }} /></label>
          <label className="text-sm font-semibold">Cover image<input type="file" accept="image/*" className="mt-2 block" onChange={async (event) => { const file = event.target.files?.[0]; if (!file) return; const stored = await upload.mutateAsync({ kind: "cover", dataUrl: await fileToDataUrl(file) }); setCoverImageUrl(stored.url); }} /></label>
        </div>
        <div>
          <p className="mb-3 text-sm font-semibold">Opening hours</p>
          <div className="space-y-2">
            {WEEKDAYS.map((day) => (
              <div key={day} className="grid grid-cols-[120px_1fr] items-center gap-3 text-sm">
                <span className="capitalize">{day}</span>
                <input value={hours[day] || ""} onChange={(event) => setHours((current) => ({ ...current, [day]: event.target.value }))} placeholder="Closed or 09:00 – 17:00" className="h-10 rounded-xl border px-3" />
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Facebook" value={social.facebook} onChange={(value) => setSocial((current) => ({ ...current, facebook: value }))} />
          <Input label="Instagram" value={social.instagram} onChange={(value) => setSocial((current) => ({ ...current, instagram: value }))} />
          <Input label="LinkedIn" value={social.linkedin} onChange={(value) => setSocial((current) => ({ ...current, linkedin: value }))} />
          <Input label="WhatsApp" value={social.whatsapp} onChange={(value) => setSocial((current) => ({ ...current, whatsapp: value }))} />
        </div>
        {saved && <SavedBanner>Your profile is saved.</SavedBanner>}
        <div className="flex justify-end">
          <Button type="submit" disabled={update.isPending || create.isPending}><PendingSpinner pending={update.isPending || create.isPending} /> Save profile</Button>
        </div>
        <p className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]"><LockKeyhole size={14} /> Your listing is reviewed before it appears publicly.</p>
      </form>
    </DashboardFrame>
  );
}

export function OwnerPostsPage() {
  const dashboard = useGetBusinessDashboard({ query: { queryKey: getGetBusinessDashboardQueryKey(), retry: false } });
  const businessId = dashboard.data?.business.id || "";
  const posts = useListBusinessPosts(businessId, { query: { queryKey: ["/api/businesses", businessId, "posts"], enabled: Boolean(businessId) } });
  const create = useCreatePost();
  const remove = useDeletePost();
  const [type, setType] = useState<PostInputType>("announcement");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const queryClient = useQueryClient();
  return (
    <DashboardFrame title="Community posts" owner>
      <form
        className="mb-8 space-y-4 rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (!businessId) return;
          create.mutate(
            { id: businessId, data: { type, title, content } },
            {
              onSuccess: () => {
                setTitle("");
                setContent("");
                queryClient.invalidateQueries({ queryKey: ["/api/businesses", businessId, "posts"] });
              },
            },
          );
        }}
      >
        <div className="flex flex-wrap gap-2">
          {(["announcement", "deal", "event"] as const).map((item) => (
            <button type="button" key={item} onClick={() => setType(item)} className={`rounded-full px-4 py-2 text-sm font-bold capitalize ${type === item ? "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]" : "border border-[hsl(var(--border))]"}`}>{item}</button>
          ))}
        </div>
        <Input label="Title" value={title} onChange={setTitle} required />
        <Input label="Content" value={content} onChange={setContent} textarea required />
        <Button type="submit" disabled={create.isPending || !businessId}><Plus size={16} /> Publish</Button>
      </form>
      {posts.data?.items?.length ? posts.data.items.map((post) => (
        <div className="mb-4" key={post.id}>
          <PostCard post={post} canManage onDelete={(id) => remove.mutate({ id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/businesses", businessId, "posts"] }) })} />
        </div>
      )) : <EmptyState title="No community posts yet" body="Publish an announcement, deal, or event to start the conversation." />}
    </DashboardFrame>
  );
}

export function PromotePage() {
  const products = usePaymentProducts();
  const checkout = useCreateCheckout();
  const dashboard = useGetBusinessDashboard({ query: { queryKey: getGetBusinessDashboardQueryKey(), retry: false } });
  const [message, setMessage] = useState("");
  return (
    <DashboardFrame title="Promote" owner>
      <p className="mb-6 max-w-2xl text-sm text-[hsl(var(--muted-foreground))]">Listing fees and sponsored placements use a payment adapter. Live Whop charges are not created until credentials are configured.</p>
      <p className="mb-6 text-xs font-bold uppercase tracking-widest">Mode: {products.data?.mode || "development"}</p>
      <div className="grid gap-4 md:grid-cols-3">
        {(products.data?.items || []).map((product) => (
          <div key={product.id} className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5">
            <h3 className="display-font text-xl font-bold">{product.name}</h3>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{product.description}</p>
            <p className="mt-4 font-bold">{money(product.amount, product.currency)}</p>
            <Button
              className="mt-4"
              disabled={checkout.isPending}
              onClick={() =>
                checkout.mutate(
                  { productId: product.id, businessId: dashboard.data?.business.id },
                  { onSuccess: (result) => setMessage(result.message) },
                )
              }
            >
              Request checkout
            </Button>
          </div>
        ))}
      </div>
      {message && <p className="mt-6 rounded-2xl bg-[hsl(var(--secondary))]/40 px-4 py-3 text-sm font-semibold">{message}</p>}
    </DashboardFrame>
  );
}

export function AdminOverview() {
  const query = useGetAdminDashboard({ query: { queryKey: getGetAdminDashboardQueryKey() } });
  if (query.isLoading) return <DashboardFrame title="Overview" admin><LoadingPage /></DashboardFrame>;
  if (query.isError || !query.data) return <DashboardFrame title="Overview" admin><ErrorState retry={() => query.refetch()} /></DashboardFrame>;
  const data = query.data;
  return (
    <DashboardFrame title="Overview" kicker="Platform overview" admin>
      <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="People" value={compactNumber(data.stats.users)} icon={Users} />
        <StatCard label="Businesses" value={compactNumber(data.stats.businesses)} icon={Building2} tone="yellow" />
        <StatCard label="Needs review" value={data.stats.pendingBusinesses} icon={Clock3} tone="coral" />
        <StatCard label="Profile views" value={compactNumber(data.stats.profileViews)} icon={Store} />
      </div>
      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          <SectionHeading eyebrow="Incoming" title="Latest businesses" action={<Link href="/admin/businesses" className="text-sm font-bold underline">Review all</Link>} />
          {data.recentBusinesses?.map((business) => (
            <div key={business.id} className="mb-3 flex items-center justify-between">
              <div>
                <p className="font-bold">{business.name}</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))]">{business.village}</p>
              </div>
              <span className="text-xs capitalize">{business.status}</span>
            </div>
          ))}
        </div>
        <div className="rounded-3xl bg-[hsl(var(--primary))] p-6 text-[hsl(var(--primary-foreground))]">
          <SectionHeading eyebrow="People" title="New faces" />
          {data.recentUsers?.map((user) => (
            <div key={user.id} className="mb-3">
              <p className="font-bold">{user.name}</p>
              <p className="text-xs opacity-70">{user.email}</p>
            </div>
          ))}
        </div>
      </div>
    </DashboardFrame>
  );
}

export function AdminUsers() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<ListAdminUsersRole | "">("");
  const [status, setStatus] = useState<ListAdminUsersStatus | "">("");
  const [page, setPage] = useState(1);
  const params = useMemo<ListAdminUsersParams>(
    () => ({ search: search || undefined, role: role || undefined, status: status || undefined, page }),
    [search, role, status, page],
  );
  const query = useListAdminUsers(params, { query: { queryKey: getListAdminUsersQueryKey(params) } });
  const update = useUpdateUserStatus();
  const qc = useQueryClient();
  return (
    <DashboardFrame title="Users" admin>
      <div className="mb-5 grid gap-2 sm:grid-cols-[1fr_180px_180px]">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search people" className="h-11 rounded-2xl border px-4" />
        <select value={role} onChange={(event) => setRole(event.target.value as ListAdminUsersRole | "")} className="h-11 rounded-2xl border px-3"><option value="">All roles</option><option value="member">Members</option><option value="owner">Owners</option><option value="admin">Admins</option></select>
        <select value={status} onChange={(event) => setStatus(event.target.value as ListAdminUsersStatus | "")} className="h-11 rounded-2xl border px-3"><option value="">All status</option><option value="active">Active</option><option value="suspended">Suspended</option></select>
      </div>
      {query.data?.items?.length ? (
        <div className="overflow-x-auto rounded-3xl border bg-[hsl(var(--card))]">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead><tr><th className="px-5 py-4">Person</th><th>Role</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {query.data.items.map((user) => (
                <tr key={user.id} className="border-t">
                  <td className="px-5 py-4"><p className="font-bold">{user.name}</p><p className="text-xs text-[hsl(var(--muted-foreground))]">{user.email}</p></td>
                  <td className="capitalize">{user.role}</td>
                  <td>{user.status}</td>
                  <td className="px-5 py-4 text-right">
                    <Button variant="ghost" onClick={() => update.mutate({ id: user.id, data: { status: user.status === "active" ? "suspended" : "active" } }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListAdminUsersQueryKey(params) }) })}>
                      {user.status === "active" ? "Suspend" : "Reactivate"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <EmptyState title="No one by that name." body="Try a different search." />}
      <div className="mt-4 flex justify-center gap-3">
        <Button variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</Button>
        <Button variant="outline" onClick={() => setPage((value) => value + 1)}>Next</Button>
      </div>
    </DashboardFrame>
  );
}

export function AdminBusinesses() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ListAdminBusinessesStatus | "">("");
  const [page, setPage] = useState(1);
  const params = useMemo<ListAdminBusinessesParams>(
    () => ({ search: search || undefined, status: status || undefined, page }),
    [search, status, page],
  );
  const query = useListAdminBusinesses(params, { query: { queryKey: getListAdminBusinessesQueryKey(params) } });
  const update = useUpdateBusinessStatus();
  const qc = useQueryClient();
  return (
    <DashboardFrame title="Businesses" admin>
      <div className="mb-5 flex flex-col gap-2 sm:flex-row">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search businesses" className="h-11 flex-1 rounded-2xl border px-4" />
        <select value={status} onChange={(event) => setStatus(event.target.value as ListAdminBusinessesStatus | "")} className="h-11 rounded-2xl border px-3">
          <option value="">All listings</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>
      {query.data?.items?.map((business) => (
        <div className="mb-3 flex flex-col gap-4 rounded-3xl border bg-[hsl(var(--card))] p-5 sm:flex-row sm:items-center" key={business.id}>
          <div className="min-w-0 flex-1">
            <h3 className="display-font text-xl font-bold">{business.name}</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">{business.village}, {business.district}</p>
          </div>
          <select
            value={business.status}
            onChange={(event) => update.mutate({ id: business.id, data: { status: event.target.value as "pending" | "approved" | "rejected" | "suspended" } }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListAdminBusinessesQueryKey(params) }) })}
            className="h-9 rounded-full border px-3 text-xs font-bold"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approve</option>
            <option value="rejected">Reject</option>
            <option value="suspended">Suspend</option>
          </select>
        </div>
      ))}
    </DashboardFrame>
  );
}

export function AdminPosts() {
  const query = useAdminPosts({});
  const update = useUpdateAdminPostStatus();
  const qc = useQueryClient();
  return (
    <DashboardFrame title="Moderation" admin>
      {query.data?.items?.map((post) => (
        <div key={post.id} className="mb-4 rounded-3xl border bg-[hsl(var(--card))] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase">{post.type} · {post.status}</p>
              <h3 className="display-font text-xl font-bold">{post.title}</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">{post.businessName}</p>
            </div>
            <Button variant="outline" onClick={() => update.mutate({ id: post.id, status: post.status === "hidden" ? "published" : "hidden" }, { onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/posts"] }) })}>
              {post.status === "hidden" ? "Publish" : "Hide"}
            </Button>
          </div>
        </div>
      ))}
      {!query.data?.items?.length && <EmptyState title="Nothing to moderate." body="Community posts will appear here." />}
    </DashboardFrame>
  );
}

export function NotificationsPage() {
  const query = useListNotifications({ query: { queryKey: getListNotificationsQueryKey() } });
  const mark = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const qc = useQueryClient();
  return (
    <DashboardFrame title="Notifications">
      <div className="mb-5 flex justify-end">
        <Button variant="outline" onClick={() => markAll.mutate(undefined, { onSuccess: () => qc.invalidateQueries({ queryKey: getListNotificationsQueryKey() }) })}>Mark all as read</Button>
      </div>
      {query.data?.length ? query.data.map((item) => (
        <button
          key={item.id}
          onClick={() => mark.mutate({ id: item.id }, { onSuccess: () => {
            qc.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
            if (item.href) window.location.href = item.href;
          } })}
          className={`mb-3 flex w-full items-start gap-4 rounded-3xl border p-5 text-left ${item.read ? "bg-[hsl(var(--card))]" : "border-[hsl(var(--secondary))] bg-[hsl(var(--secondary))]/20"}`}
        >
          <Bell size={17} />
          <div>
            <h3 className="font-bold">{item.title}</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">{item.message}</p>
          </div>
        </button>
      )) : <EmptyState title="No notifications" body="When something happens in your local communities, it’ll land here." />}
    </DashboardFrame>
  );
}

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}
