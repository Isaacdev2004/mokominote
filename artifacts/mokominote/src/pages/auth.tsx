import { useEffect, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { ChevronLeft } from "lucide-react";
import { useForgotPassword, useLogin, useRegister, useResetPassword } from "@workspace/api-client-react";
import { Brand } from "@/components/layout";
import { Button, Input, PendingSpinner } from "@/components/kit";
import { setPageMeta } from "@/lib/format";

function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-[100dvh] lg:grid-cols-[.9fr_1.1fr]">
      <div className="hidden bg-[hsl(var(--primary))] p-10 text-[hsl(var(--primary-foreground))] lg:flex lg:flex-col lg:justify-between">
        <Brand inverted />
        <div>
          <p className="mono-font mb-5 text-xs font-bold uppercase tracking-widest text-[hsl(var(--secondary))]">The island’s local layer</p>
          <h1 className="display-font max-w-lg text-6xl font-bold leading-[.95]">Your neighbourhood,<br />in one place.</h1>
        </div>
        <p className="text-xs text-[hsl(var(--primary-foreground))]/50">MoKominoté · Mauritius</p>
      </div>
      <div className="flex items-center justify-center bg-[hsl(var(--background))] px-5 py-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}

export function AuthPage({ mode }: { mode: "login" | "register" }) {
  const [, setLocation] = useLocation();
  const login = useLogin();
  const register = useRegister();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"member" | "owner">("member");
  const [error, setError] = useState("");
  const pending = login.isPending || register.isPending;

  useEffect(() => {
    setPageMeta(mode === "login" ? "Log in — MoKominoté" : "Join MoKominoté");
  }, [mode]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (mode === "login") {
      login.mutate(
        { data: { email, password } },
        {
          onSuccess: (user) => setLocation(user.role === "admin" ? "/admin" : user.role === "owner" ? "/dashboard/business" : "/member"),
          onError: (err) => setError((err as { message?: string }).message || "Please check your details and try again."),
        },
      );
    } else {
      register.mutate(
        { data: { name, email, password, role } },
        {
          onSuccess: (user) => setLocation(user.role === "owner" ? "/dashboard/business" : "/member"),
          onError: (err) => setError((err as { message?: string }).message || "Could not create your account."),
        },
      );
    }
  };

  return (
    <AuthFrame>
      <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-[hsl(var(--muted-foreground))]"><ChevronLeft size={16} /> Back to MoKominoté</Link>
      <p className="mono-font text-xs font-bold uppercase tracking-widest text-[hsl(var(--accent))]">{mode === "login" ? "Welcome back" : "Make yourself local"}</p>
      <h1 className="display-font mt-3 text-4xl font-bold">{mode === "login" ? "Good to see you." : "Come on in."}</h1>
      <form onSubmit={submit} className="mt-8 space-y-4">
        {mode === "register" && <Input label="Your name" value={name} onChange={setName} required />}
        <Input label="Email" type="email" value={email} onChange={setEmail} required />
        <Input label="Password" type="password" value={password} onChange={setPassword} required hint={mode === "register" ? "At least 8 characters" : undefined} />
        {mode === "register" && (
          <div>
            <p className="mb-2 text-sm font-semibold">I’m here as a</p>
            <div className="grid grid-cols-2 gap-2">
              {(["member", "owner"] as const).map((item) => (
                <button type="button" key={item} onClick={() => setRole(item)} className={`rounded-2xl border p-3 text-left text-sm font-bold ${role === item ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5" : "border-[hsl(var(--border))]"}`}>
                  <span className="block capitalize">{item === "owner" ? "Business owner" : "Member"}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {error && <p className="rounded-xl bg-[hsl(var(--destructive))]/10 px-3 py-2 text-sm font-semibold text-[hsl(var(--destructive))]">{error}</p>}
        <Button type="submit" className="h-12 w-full" disabled={pending}>
          <PendingSpinner pending={pending} />
          {mode === "login" ? "Log in" : "Create account"}
        </Button>
      </form>
      {mode === "login" && <p className="mt-4 text-sm"><Link href="/forgot-password" className="font-bold text-[hsl(var(--accent))] underline">Forgot password?</Link></p>}
      <p className="mt-7 text-center text-sm text-[hsl(var(--muted-foreground))]">
        {mode === "login" ? "New to the island layer?" : "Already have an account?"}{" "}
        <Link href={mode === "login" ? "/register" : "/login"} className="font-bold text-[hsl(var(--accent))] underline">{mode === "login" ? "Join us" : "Log in"}</Link>
      </p>
    </AuthFrame>
  );
}

export function ForgotPasswordPage() {
  const forgot = useForgotPassword();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => { setPageMeta("Reset password — MoKominoté"); }, []);
  return (
    <AuthFrame>
      <h1 className="display-font text-4xl font-bold">Reset your password</h1>
      <p className="mt-3 text-[hsl(var(--muted-foreground))]">If an account exists, we prepare a reset token. Email delivery can be connected later.</p>
      <form
        className="mt-8 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          forgot.mutate(
            { email },
            {
              onSuccess: (result) => {
                setMessage(result.devResetToken ? `Development reset token: ${result.devResetToken}` : "If that email exists, a reset path is ready.");
              },
            },
          );
        }}
      >
        <Input label="Email" type="email" value={email} onChange={setEmail} required />
        <Button type="submit" className="w-full" disabled={forgot.isPending}>Send reset</Button>
      </form>
      {message && <p className="mt-4 break-all text-sm font-semibold">{message}</p>}
      <Link href="/reset-password" className="mt-6 inline-block text-sm font-bold underline">I already have a token</Link>
    </AuthFrame>
  );
}

export function ResetPasswordPage() {
  const search = useSearch();
  const tokenFromUrl = new URLSearchParams(search).get("token") || "";
  const reset = useResetPassword();
  const [, setLocation] = useLocation();
  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { setPageMeta("Choose a new password — MoKominoté"); }, []);
  return (
    <AuthFrame>
      <h1 className="display-font text-4xl font-bold">Choose a new password</h1>
      <form
        className="mt-8 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          reset.mutate(
            { token, password },
            {
              onSuccess: () => setLocation("/login"),
              onError: (err) => setError((err as { message?: string }).message || "This reset link is no longer valid."),
            },
          );
        }}
      >
        <Input label="Reset token" value={token} onChange={setToken} required />
        <Input label="New password" type="password" value={password} onChange={setPassword} required />
        {error && <p className="text-sm font-semibold text-[hsl(var(--destructive))]">{error}</p>}
        <Button type="submit" className="w-full" disabled={reset.isPending}>Update password</Button>
      </form>
    </AuthFrame>
  );
}
