import { TriangleAlertIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import { formatPercentPoint } from "../lib/format";

/** Drift vs target; out-of-band drift gets a status badge (icon + label, never color alone). */
export function DriftBadge({ drift, band, outOfBand }: { drift: number; band: number; outOfBand: boolean }) {
  if (!outOfBand) {
    return <span className="text-muted-foreground tabular-nums">{formatPercentPoint(drift)}</span>;
  }
  return (
    <Badge variant="critical" title={`허용 밴드 ±${(band * 100).toFixed(1)}%p 초과`}>
      <TriangleAlertIcon className="text-critical" aria-hidden />
      <span className="tabular-nums">{formatPercentPoint(drift)}</span>
      <span>{drift > 0 ? "초과" : "미달"}</span>
    </Badge>
  );
}
