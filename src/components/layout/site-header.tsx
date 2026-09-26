import Link from "next/link";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/supabase/sign-out";

import { NavLinks } from "./nav-links";

export function SiteHeader({ email }: { email: string | undefined }) {
  return (
    <header className="bg-background/95 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4 sm:gap-4">
        <Link href="/" className="shrink-0 font-semibold tracking-tight whitespace-nowrap">
          My Life
        </Link>
        <NavLinks />
        <form action={signOut} className="ml-auto flex shrink-0 items-center gap-3">
          <span className="text-muted-foreground hidden text-xs sm:inline">{email}</span>
          <Button type="submit" variant="ghost" size="sm">
            로그아웃
          </Button>
        </form>
      </div>
    </header>
  );
}
