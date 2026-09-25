import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const modules = [
  {
    key: "capital",
    title: "자본 · Capital",
    description: "포트폴리오 목표 비중, 괴리율, 신규 현금 배분",
  },
  {
    key: "mind",
    title: "사유 · Mind",
    description: "에세이와 메모, 마크다운 본문과 단락 구조",
  },
  {
    key: "body",
    title: "신체 · Body",
    description: "맨몸운동 세트 기록과 러닝 거리·페이스·심박",
  },
] as const;

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">My Life Dashboard</h1>
        <p className="text-muted-foreground">자본 · 사유 · 신체를 한곳에서.</p>
      </header>
      <section className="grid gap-4 md:grid-cols-3">
        {modules.map((m) => (
          <Card key={m.key}>
            <CardHeader>
              <CardTitle>{m.title}</CardTitle>
              <CardDescription>{m.description}</CardDescription>
            </CardHeader>
            <CardContent className="text-muted-foreground text-sm">준비 중</CardContent>
          </Card>
        ))}
      </section>
    </main>
  );
}
