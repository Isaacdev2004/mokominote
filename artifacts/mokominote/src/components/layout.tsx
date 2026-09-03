import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  Bell,
  Building2,
  ChevronDown,
  ChevronLeft,
  Home as HomeIcon,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Store,
  Users,
  X,
} from "lucide-react";
import {
  getGetCurrentUserQueryKey,
  getListNotificationsQueryKey,
  useGetCurrentUser,
  useListNotifications,
  useLogout,
} from "@workspace/api-client-react";
import { Avatar, Button, ErrorState, LoadingPage } from "@/components/kit";

export function Brand({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className={`relative flex h-9 w-9 items-center justify-center rounded-[13px] ${inverted ? "bg-[hsl(var(--secondary))]" : "bg-[hsl(var(--primary))]"}`}>
        <span className={`h-3 w-3 rounded-full ${inverted ? "bg-[hsl(var(--primary))]" : "bg-[hsl(var(--secondary))]"}`} />
        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[hsl(var(--accent))]" />
      </span>
      <span className={`display-font text-xl font-bold tracking-tight ${inverted ? "text-[hsl(var(--sidebar-foreground))]" : "text-[hsl(var(--foreground))]"}`}>
        MoKominoté
      </span>
    </Link>
  );
}

function dashboardHref(role?: string) {
  if (role === "admin") return "/admin";
  if (role === "owner") return "/dashboard/business";
  return "/member";
}

export function Header() {
  const [userMenu, setUserMenu] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const { data: user } = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey(), retry: false } });
  const notifications = useListNotifications({ query: { queryKey: getListNotificationsQueryKey(), enabled: Boolean(user), retry: false } });
  const unread = (notifications.data || []).filter((item) => !item.read).length;
  const logout = useLogout();
  const [, setLocation] = useLocation();

  return (
    <header className="sticky top-0 z-40 border-b border-[hsl(var(--border))]/70 bg-[hsl(var(--background))]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-5 px-5 lg:px-8">
        <Brand />
        <nav className="hidden items-center gap-7 text-sm font-bold text-[hsl(var(--muted-foreground))] lg:flex">
          <Link href="/businesses" className="transition hover:text-[hsl(var(--foreground))]">Discover</Link>
          <Link href="/community" className="transition hover:text-[hsl(var(--foreground))]">Community</Link>
          <Link href="/#about" className="transition hover:text-[hsl(var(--foreground))]">How it works</Link>
          <Link href="/about" className="transition hover:text-[hsl(var(--foreground))]">About</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/notifications" className="relative rounded-full p-2.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]" aria-label="Notifications">
            <Bell size={19} />
            {unread > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[hsl(var(--accent))]" />}
          </Link>
          {user ? (
            <div className="relative">
              <button onClick={() => setUserMenu(!userMenu)} className="flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1.5 pr-3">
                <Avatar name={user.name} src={user.avatarUrl} size="sm" />
                <span className="hidden text-sm font-bold sm:block">{user.name.split(" ")[0]}</span>
                <ChevronDown size={14} />
              </button>
              {userMenu && (
                <div className="absolute right-0 top-12 w-48 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-2 shadow-xl">
                  <Link href={dashboardHref(user.role)} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-[hsl(var(--muted))]">
                    <LayoutDashboard size={15} /> My space
                  </Link>
                  <Link href="/profile" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-[hsl(var(--muted))]">
                    Profile
                  </Link>
                  <button
                    onClick={() => logout.mutate(undefined, { onSuccess: () => setLocation("/") })}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[hsl(var(--accent))] hover:bg-[hsl(var(--muted))]"
                  >
                    <LogOut size={15} /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className="hidden px-3 py-2 text-sm font-bold sm:block">Log in</Link>
              <Link href="/register" className="rounded-full bg-[hsl(var(--primary))] px-4 py-2.5 text-sm font-bold text-[hsl(var(--primary-foreground))] transition hover:-translate-y-0.5">Join us</Link>
            </>
          )}
          <button className="rounded-full p-2 lg:hidden" onClick={() => setMobileNav(true)} aria-label="Open menu">
            <Menu />
          </button>
        </div>
      </div>
      {mobileNav && (
        <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--card))] px-5 py-4 lg:hidden">
          <div className="mb-3 flex justify-end">
            <button onClick={() => setMobileNav(false)} aria-label="Close menu"><X /></button>
          </div>
          <nav className="grid gap-2 text-sm font-bold">
            <Link href="/businesses" onClick={() => setMobileNav(false)}>Discover</Link>
            <Link href="/community" onClick={() => setMobileNav(false)}>Community</Link>
            <Link href="/about" onClick={() => setMobileNav(false)}>About</Link>
            <Link href="/login" onClick={() => setMobileNav(false)}>Log in</Link>
          </nav>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-20 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted))]/45">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 text-sm text-[hsl(var(--muted-foreground))] sm:grid-cols-4 lg:px-8">
        <div className="space-y-3">
          <Brand />
          <p>Discover local. Connect community. Made for Mauritius.</p>
        </div>
        <div>
          <p className="mb-3 font-bold text-[hsl(var(--foreground))]">Explore</p>
          <div className="grid gap-2">
            <Link href="/about">About</Link>
            <Link href="/businesses">Businesses</Link>
            <Link href="/community">Community</Link>
            <Link href="/contact">Contact</Link>
          </div>
        </div>
        <div>
          <p className="mb-3 font-bold text-[hsl(var(--foreground))]">Account</p>
          <div className="grid gap-2">
            <Link href="/login">Login</Link>
            <Link href="/register">Register</Link>
            <Link href="/register">List your business</Link>
          </div>
        </div>
        <div>
          <p className="mb-3 font-bold text-[hsl(var(--foreground))]">Legal</p>
          <div className="grid gap-2">
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grain min-h-[100dvh] bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      <Header />
      {children}
      <Footer />
    </div>
  );
}

export function DashboardFrame({
  title,
  kicker,
  children,
  owner = false,
  admin = false,
}: {
  title: string;
  kicker?: string;
  children: React.ReactNode;
  owner?: boolean;
  admin?: boolean;
}) {
  const [mobileNav, setMobileNav] = useState(false);
  const [, setLocation] = useLocation();
  const logout = useLogout();
  const { data: user } = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey(), retry: false } });
  const nav = admin
    ? [
        { href: "/admin", label: "Overview", icon: LayoutDashboard },
        { href: "/admin/users", label: "Users", icon: Users },
        { href: "/admin/businesses", label: "Businesses", icon: Building2 },
        { href: "/admin/posts", label: "Moderation", icon: Search },
      ]
    : owner
      ? [
          { href: "/dashboard/business", label: "Overview", icon: LayoutDashboard },
          { href: "/dashboard/business/profile", label: "Your profile", icon: Store },
          { href: "/dashboard/business/posts", label: "Community posts", icon: Search },
          { href: "/dashboard/business/promote", label: "Promote", icon: Building2 },
        ]
      : [
          { href: "/member", label: "My home", icon: HomeIcon },
          { href: "/businesses", label: "Discover", icon: Search },
          { href: "/community", label: "Community", icon: Users },
          { href: "/notifications", label: "Notifications", icon: Bell },
          { href: "/profile", label: "Profile", icon: Store },
        ];

  return (
    <div className="min-h-[100dvh] bg-[hsl(var(--background))]">
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-[hsl(var(--sidebar))] p-6 text-[hsl(var(--sidebar-foreground))] transition-transform lg:translate-x-0 ${mobileNav ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between">
          <Brand inverted />
          <button onClick={() => setMobileNav(false)} className="lg:hidden" aria-label="Close navigation"><X /></button>
        </div>
        <div className="mt-12">
          <p className="mono-font mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--sidebar-foreground))]/45">
            {admin ? "Steward desk" : owner ? "Business studio" : "Your local layer"}
          </p>
          <nav className="space-y-1">
            {nav.map((item) => (
              <Link
                href={item.href}
                key={item.href}
                onClick={() => setMobileNav(false)}
                className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-[hsl(var(--sidebar-foreground))]/70 transition hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-foreground))]"
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="absolute bottom-6 left-6 right-6">
          <Link href="/" className="mb-2 flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-[hsl(var(--sidebar-foreground))]/60 hover:bg-[hsl(var(--sidebar-accent))]">
            <ChevronLeft size={18} /> Back to site
          </Link>
          <button onClick={() => logout.mutate(undefined, { onSuccess: () => setLocation("/") })} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold text-[hsl(var(--secondary))]">
            <LogOut size={18} /> Sign out
          </button>
        </div>
      </aside>
      {mobileNav && <button onClick={() => setMobileNav(false)} className="fixed inset-0 z-40 bg-[hsl(var(--primary))]/40 lg:hidden" aria-label="Close navigation" />}
      <div className="lg:pl-72">
        <header className="flex h-[76px] items-center justify-between border-b border-[hsl(var(--border))] px-5 lg:px-10">
          <button onClick={() => setMobileNav(true)} className="rounded-full p-2 hover:bg-[hsl(var(--muted))] lg:hidden" aria-label="Open navigation"><Menu /></button>
          <div className="hidden lg:block">
            <p className="mono-font text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--accent))]">{kicker || "MoKominoté"}</p>
            <h1 className="display-font text-2xl font-bold">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/notifications" className="rounded-full p-2.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]" aria-label="Notifications"><Bell size={18} /></Link>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold">{user?.name || (admin ? "Platform team" : owner ? "Business owner" : "Member")}</p>
              <p className="text-xs capitalize text-[hsl(var(--muted-foreground))]">{user?.role || "Mauritius"}</p>
            </div>
            <Avatar name={user?.name} src={user?.avatarUrl} />
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-5 lg:p-10">
          <div className="mb-8 lg:hidden">
            <p className="mono-font text-[10px] font-bold uppercase tracking-[0.2em] text-[hsl(var(--accent))]">{kicker || "MoKominoté"}</p>
            <h1 className="display-font mt-1 text-3xl font-bold">{title}</h1>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

export function ProtectedRoute({
  roles,
  children,
}: {
  roles?: Array<"member" | "owner" | "admin">;
  children: React.ReactNode;
}) {
  const { data: user, isLoading, isError } = useGetCurrentUser({ query: { queryKey: getGetCurrentUserQueryKey(), retry: false } });
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && (isError || !user)) setLocation("/login");
  }, [isLoading, isError, user, setLocation]);

  if (isLoading) return <LoadingPage />;
  if (!user) {
    return (
      <AppShell>
        <main className="mx-auto max-w-xl px-5 py-16">
          <ErrorState title="Please log in" body="This space is for signed-in members of MoKominoté." />
        </main>
      </AppShell>
    );
  }
  if (roles && !roles.includes(user.role)) {
    return (
      <AppShell>
        <main className="mx-auto max-w-xl px-5 py-16">
          <ErrorState title="You don’t have access" body="This area belongs to another role on the platform." />
          <div className="mt-5 text-center">
            <Button onClick={() => setLocation(dashboardHref(user.role))}>Go to my space</Button>
          </div>
        </main>
      </AppShell>
    );
  }
  return <>{children}</>;
}
