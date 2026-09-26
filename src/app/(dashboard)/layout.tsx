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
        {missing.length === 0 ? (
          children
        ) : missing.length < REQUIRED_TABLES.length ? (
          // Some tables exist: the schema gained new ones since it was last run.
          <SetupRequired
            missing={missing}
            title="새 기능 때문에 한 번 더 준비가 필요합니다"
            description="기존 기록은 그대로 있어요. 새 기능(실시간 시세, 매달 입금, 자산 추이)에 필요한 표가 추가됐습니다. 아래 순서대로 schema.sql을 한 번 더 실행하면 됩니다."
          />
        ) : (
          <SetupRequired missing={missing} />
        )}
      </main>
    </>
  );
}
