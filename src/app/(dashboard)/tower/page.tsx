import { SetupRequired } from "@/components/layout/setup-required";
import { requireUser } from "@/lib/supabase/auth";
import { findMissingTables } from "@/lib/supabase/schema-check";
import { TowerFrame } from "@/modules/tower/components/tower-frame";

export const metadata = { title: "관제탑 · My Life Dashboard" };

export default async function TowerPage() {
  const { user } = await requireUser();
  const missing = await findMissingTables("tower_docs");

  if (missing.length > 0) {
    return (
      <SetupRequired
        missing={missing}
        title="관제탑을 쓰려면 한 번 더 준비가 필요합니다"
        description="관제탑 기록을 저장할 표가 새로 추가됐어요. 아래 순서대로 schema.sql을 한 번 더 실행하면 됩니다."
      />
    );
  }

  return <TowerFrame userId={user.id} />;
}
