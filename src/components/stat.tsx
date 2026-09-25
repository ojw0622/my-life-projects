import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** A single headline number with a label. */
export function Stat({
  label,
  value,
  tone,
  note,
}: {
  label: string;
  value: string;
  tone?: "critical";
  note?: string;
}) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="grid gap-1">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className={cn("text-xl font-semibold tabular-nums", tone === "critical" && "text-critical")}>{value}</p>
        {note ? <p className="text-muted-foreground text-xs">{note}</p> : null}
      </CardContent>
    </Card>
  );
}
