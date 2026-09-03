export function initials(name = "") {
  return (
    name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "MK"
  );
}

export function dateLabel(value?: string) {
  if (!value) return "Recently";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-MU", { day: "numeric", month: "short" }).format(date);
}

export function compactNumber(value = 0) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function money(amount: number, currency = "MUR") {
  return new Intl.NumberFormat("en-MU", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount / 100);
}

export function setPageMeta(title: string, description?: string) {
  document.title = title;
  if (!description) return;
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute("content", description);
}
