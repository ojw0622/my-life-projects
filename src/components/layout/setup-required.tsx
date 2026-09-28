import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { CopySchemaButton } from "./copy-schema-button";

const SCHEMA_URL = "https://github.com/ojw0622/my-life-projects/blob/main/supabase/schema.sql";

/** Shown instead of the dashboard until supabase/schema.sql has been run. */
export function SetupRequired({
  missing,
  title = "데이터베이스 준비가 한 번 필요합니다",
  description = "로그인은 정상입니다. 기록을 저장할 표(테이블)가 아직 Supabase에 없어서 화면을 열 수 없어요. 아래 순서대로 한 번만 하면 됩니다.",
}: {
  missing: string[];
  title?: string;
  description?: string;
}) {
  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 text-sm">
        <ol className="grid list-decimal gap-3 pl-5 leading-relaxed">
          <li>
            <span className="flex flex-wrap items-center gap-2">
              아래 버튼을 눌러 SQL을 복사합니다. <CopySchemaButton fallbackUrl={SCHEMA_URL} />
            </span>
          </li>
          <li>
            Supabase 대시보드 왼쪽 메뉴에서 <b>SQL Editor</b>를 누르고, 빈 칸에 붙여넣습니다.
          </li>
          <li>
            오른쪽 아래 <b>Run</b>을 누릅니다. &quot;Success. No rows returned&quot;가 나오면 성공입니다.
          </li>
          <li>이 페이지를 새로고침합니다.</li>
        </ol>
        <p className="text-muted-foreground text-xs">
          이미 실행한 적이 있어도 다시 실행해도 됩니다. 기존 기록은 지워지지 않습니다.
        </p>
        <p className="text-muted-foreground text-xs">없는 테이블: {missing.join(", ")}</p>
      </CardContent>
    </Card>
  );
}
