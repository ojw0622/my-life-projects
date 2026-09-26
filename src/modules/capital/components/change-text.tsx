import { cn } from "@/lib/utils";

import { formatSignedPercent } from "../lib/format";

/**
 * A price move with an arrow and colour (up = red, down = blue, as in Korean
 * markets). The arrow and sign carry the meaning without colour.
 */
export function ChangeText({
  rate,
  amount,
  className,
}: {
  rate: number | null;
  amount?: string;
  className?: string;
}) {
  if (rate === null) return <span className={cn("text-muted-foreground", className)}>–</span>;
  const flat = Math.abs(rate) < 0.00005;
  const up = !flat && rate > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 tabular-nums",
        flat ? "text-muted-foreground" : up ? "text-up" : "text-down",
        className,
      )}
    >
      <span aria-hidden className="text-[0.7em]">
        {flat ? "–" : up ? "▲" : "▼"}
      </span>
      {amount ? <span>{amount}</span> : null}
      <span>{amount ? `(${formatSignedPercent(rate)})` : formatSignedPercent(rate)}</span>
    </span>
  );
}
