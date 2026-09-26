"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "홈" },
  { href: "/capital", label: "자본" },
  { href: "/mind", label: "사유" },
  { href: "/body", label: "신체" },
  { href: "/tower", label: "관제탑" },
] as const;

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex min-w-0 items-center gap-0.5 overflow-x-auto text-sm sm:gap-1">
      {LINKS.map(({ href, label }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full px-2.5 py-1.5 whitespace-nowrap transition-all duration-200 sm:px-3.5",
              active
                ? "bg-foreground text-background font-medium shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
