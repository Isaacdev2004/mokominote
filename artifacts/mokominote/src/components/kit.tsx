import { Check, Loader2, Sparkles, X } from "lucide-react";
import { initials } from "@/lib/format";

export function Avatar({
  name,
  src,
  size = "md",
}: {
  name?: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = { sm: "h-8 w-8 text-[10px]", md: "h-10 w-10 text-xs", lg: "h-16 w-16 text-lg" };
  return src ? (
    <img
      src={src}
      alt={name || "Profile"}
      className={`${sizes[size]} rounded-full object-cover ring-2 ring-[hsl(var(--card))]`}
    />
  ) : (
    <div
      className={`${sizes[size]} flex shrink-0 items-center justify-center rounded-full bg-[hsl(var(--secondary))] font-bold text-[hsl(var(--primary))]`}
    >
      {initials(name)}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  type = "button",
  onClick,
  disabled,
  testId,
}: {
  children: React.ReactNode;
  variant?: "primary" | "outline" | "ghost" | "accent" | "danger";
  className?: string;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
  testId?: string;
}) {
  const styles = {
    primary: "bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:-translate-y-0.5 hover:shadow-lg",
    outline: "border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] hover:border-[hsl(var(--primary))] hover:-translate-y-0.5",
    ghost: "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]",
    accent: "bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:-translate-y-0.5 hover:shadow-lg",
    danger: "bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] hover:-translate-y-0.5",
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
      data-testid={testId}
    >
      {children}
    </button>
  );
}

export function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  textarea = false,
  required = false,
  hint,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  textarea?: boolean;
  required?: boolean;
  hint?: string;
}) {
  const id = label?.toLowerCase().replaceAll(" ", "-");
  return (
    <label className="block space-y-1.5 text-sm font-semibold text-[hsl(var(--foreground))]">
      {label && <span>{label}</span>}
      {textarea ? (
        <textarea
          id={id}
          required={required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="min-h-28 w-full resize-y rounded-2xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-4 py-3 font-normal outline-none transition focus:border-[hsl(var(--primary))]"
        />
      ) : (
        <input
          id={id}
          required={required}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-12 w-full rounded-2xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-4 outline-none transition focus:border-[hsl(var(--primary))]"
        />
      )}
      {hint && <span className="block font-normal text-xs text-[hsl(var(--muted-foreground))]">{hint}</span>}
    </label>
  );
}

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-2xl ${className}`} aria-label="Loading" />;
}

export function LoadingPage() {
  return (
    <div className="space-y-6 p-6">
      <SkeletonBlock className="h-8 w-48" />
      <SkeletonBlock className="h-28 w-full" />
      <div className="grid gap-4 md:grid-cols-3">
        <SkeletonBlock className="h-44" />
        <SkeletonBlock className="h-44" />
        <SkeletonBlock className="h-44" />
      </div>
    </div>
  );
}

export function ErrorState({ retry, title = "That didn’t load", body = "Something got in the way. Give it another try." }: { retry?: () => void; title?: string; body?: string }) {
  return (
    <div className="rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-10 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))]">
        <X />
      </div>
      <h2 className="display-font text-xl font-bold">{title}</h2>
      <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{body}</p>
      {retry && (
        <Button variant="outline" onClick={retry} className="mt-5" testId="button-retry">
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--muted))]/40 p-10 text-center">
      <Sparkles className="mx-auto mb-3 text-[hsl(var(--accent))]" />
      <h3 className="display-font text-xl font-bold">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-[hsl(var(--muted-foreground))]">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  body,
  action,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="mono-font mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[hsl(var(--accent))]">{eyebrow}</p>
        <h2 className="display-font text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
        {body && <p className="mt-2 max-w-xl text-[hsl(var(--muted-foreground))]">{body}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  note,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  note?: string;
  icon: React.ComponentType<{ size?: number }>;
  tone?: "default" | "yellow" | "coral";
}) {
  return (
    <div
      className={`rounded-3xl border border-[hsl(var(--border))] p-5 ${
        tone === "yellow"
          ? "bg-[hsl(var(--secondary))]"
          : tone === "coral"
            ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
            : "bg-[hsl(var(--card))]"
      }`}
    >
      <div className="flex items-start justify-between">
        <span className="text-sm font-semibold opacity-75">{label}</span>
        <Icon size={18} />
      </div>
      <p className="display-font mt-6 text-4xl font-bold">{value}</p>
      {note && <p className="mt-1 text-xs font-semibold opacity-70">{note}</p>}
    </div>
  );
}

export function SavedBanner({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl bg-[hsl(var(--secondary))]/35 px-4 py-3 text-sm font-bold">
      <Check className="mr-2 inline" size={16} />
      {children}
    </p>
  );
}

export function PendingSpinner({ pending }: { pending?: boolean }) {
  return pending ? <Loader2 className="animate-spin" size={17} /> : null;
}
