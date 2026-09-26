import { SetupRequired } from "@/components/layout/setup-required";
import { SiteHeader } from "@/components/layout/site-header";
import { requireUser } from "@/lib/supabase/auth";
import { findMissingTables, REQUIRED_TABLES } from "@/lib/supabase/schema-check";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const { user } = await requireUser();
  const missing = await findMissingTables(...REQUIRED_TABLES);

  return (
    <>
      <SiteHeader email={user.email} />
      <main className="stagger mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:py-10">
        {missing.length > 0 ? <SetupRequired missing={missing} /> : children}
      </main>
    </>
  );
}
