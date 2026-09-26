import Link from "next/link";
import { LogOutIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/supabase/sign-out";

import { NavLinks } from "./nav-links";

export function SiteHeader({ email }: { email: string | undefined }) {
  return (
    <header className="bg-background/80 supports-[backdrop-filter]:bg-background/65 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-2 px-4 sm:gap-4">
        <Link href="/" className="group flex shrink-0 items-center gap-2 font-semibold tracking-tight whitespace-nowrap">
          <span
            aria-hidden
            className="size-2.5 rounded-full bg-[conic-gradient(from_180deg,#2a78d6,#1baf7a,#eda100,#e87ba4,#2a78d6)] transition-transform duration-500 group-hover:rotate-180"
          />
          <span className="hidden sm:inline">My Life</span>
        </Link>
        <NavLinks />
        <form action={signOut} className="ml-auto flex shrink-0 items-center gap-3">
          <span className="text-muted-foreground hidden text-xs sm:inline">{email}</span>
          <Button type="submit" variant="ghost" size="sm" aria-label="로그아웃" title="로그아웃">
            <LogOutIcon className="sm:hidden" />
            <span className="hidden sm:inline">로그아웃</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
