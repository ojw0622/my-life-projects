import { cn } from "@/lib/utils";

/** Title block shared by every dashboard page: small eyebrow, title, one-line description. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="grid gap-1.5">
        <p
          className={cn(
            "text-muted-foreground text-xs font-medium",
            // Letter-spaced small caps suit Latin labels, not Korean dates.
            /^[\x20-\x7E]+$/.test(eyebrow) && "text-[11px] tracking-[0.18em] uppercase",
          )}
        >
          {eyebrow}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[1.75rem]">{title}</h1>
        {description ? <p className="text-muted-foreground text-sm">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}
