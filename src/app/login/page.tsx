import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { LoginForm } from "./login-form";

export default async function LoginPage(props: PageProps<"/login">) {
  const { next, error } = await props.searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>My Life Dashboard</CardTitle>
          <CardDescription>자본 · 사유 · 신체 기록은 본인만 볼 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              인증 링크가 만료되었거나 올바르지 않습니다. 다시 시도하세요.
            </p>
          ) : null}
          <LoginForm next={typeof next === "string" ? next : undefined} />
        </CardContent>
      </Card>
    </main>
  );
}
