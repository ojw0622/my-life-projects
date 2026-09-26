import type { Currency } from "@/lib/supabase/database.types";

const krw = new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 });
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export function formatMoney(value: number, currency: Currency = "KRW"): string {
  return currency === "USD" ? usd.format(value) : krw.format(value);
}

/** Formats a fraction as a percentage, e.g. 0.1234 → "12.3%". */
export function formatPercent(fraction: number, digits = 1): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

/** Formats a signed fraction as percentage points, e.g. 0.042 → "+4.2%p". */
export function formatPercentPoint(fraction: number, digits = 1): string {
  const value = (fraction * 100).toFixed(digits);
  const sign = fraction > 0 && Number(value) !== 0 ? "+" : "";
  return `${sign}${Number(value) === 0 ? (0).toFixed(digits) : value}%p`;
}

/** Trims float noise from quantities: up to 8 decimals, no trailing zeros. */
export function formatQuantity(quantity: number): string {
  return quantity.toLocaleString("ko-KR", { maximumFractionDigits: 8 });
}

/** Signed money, e.g. +₩12,000 / -₩3,000. */
export function formatSignedMoney(value: number, currency: Currency = "KRW"): string {
  const rounded = currency === "USD" ? Math.round(value * 100) / 100 : Math.round(value);
  if (rounded === 0) return formatMoney(0, currency);
  return `${rounded > 0 ? "+" : "-"}${formatMoney(Math.abs(rounded), currency)}`;
}

/** Signed percentage, e.g. 0.0123 → "+1.23%". */
export function formatSignedPercent(fraction: number, digits = 2): string {
  const value = (fraction * 100).toFixed(digits);
  if (Number(value) === 0) return `${(0).toFixed(digits)}%`;
  return `${fraction > 0 ? "+" : ""}${value}%`;
}

const timeFormat = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** "9. 26. 14:05" style timestamp in Korea time. */
export function formatUpdatedAt(iso: string): string {
  return timeFormat.format(new Date(iso));
}
