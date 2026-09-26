import Link from "next/link";
import { PlusIcon } from "lucide-react";

import { DeleteButton } from "@/components/delete-button";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { deletePrinciple } from "@/modules/mind/actions";
import { PrincipleForm } from "@/modules/mind/components/principle-form";
import { PRINCIPLE_CATEGORIES, PRINCIPLE_CATEGORY_LABELS } from "@/modules/mind/lib/constants";
import { excerpt } from "@/modules/mind/lib/essay";
import { getEssays, getPrinciples } from "@/modules/mind/queries";

export const metadata = { title: "사유 · My Life Dashboard" };

const dateFormat = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeZone: "Asia/Seoul" });

export default async function MindPage() {
  const [essays, principles] = await Promise.all([getEssays(), getPrinciples()]);

  return (
    <>
      <PageHeader
        eyebrow="Mind"
        title="사유"
        description="에세이와 원칙"
        actions={
          <Button asChild>
            <Link href="/mind/new">
              <PlusIcon /> 새 글
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section aria-labelledby="essays-heading" className="grid content-start gap-3">
          <h2 id="essays-heading" className="text-muted-foreground text-sm font-medium">
            에세이 {essays.length}편
          </h2>
          {essays.length === 0 ? (
            <Link
              href="/mind/new"
              className="card-lift text-muted-foreground bg-card/50 grid place-items-center gap-1 rounded-xl border border-dashed p-10 text-center text-sm"
            >
              <span className="font-serif text-foreground text-lg">첫 글을 써 볼까요?</span>
              오늘 떠오른 생각 한 줄이면 충분합니다.
            </Link>
          ) : (
            essays.map((essay) => (
              <Link key={essay.id} href={`/mind/${essay.id}`} className="group">
                <Card className="card-lift gap-2 py-5">
                  <CardHeader>
                    <CardDescription className="text-xs">{dateFormat.format(new Date(essay.created_at))}</CardDescription>
                    <CardTitle className="font-serif text-lg leading-snug">{essay.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">{excerpt(essay.content)}</p>
                    {essay.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {essay.tags.map((t) => (
                          <Badge key={t} variant="secondary">
                            #{t}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </section>

        <Card className="content-start">
          <CardHeader>
            <CardTitle>원칙</CardTitle>
            <CardDescription>흔들릴 때 돌아올 규칙</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <PrincipleForm />
            {PRINCIPLE_CATEGORIES.map((category) => {
              const items = principles.filter((p) => p.category === category);
              if (items.length === 0) return null;
              return (
                <div key={category} className="grid gap-1">
                  <h3 className="text-muted-foreground text-xs font-medium">{PRINCIPLE_CATEGORY_LABELS[category]}</h3>
                  <ol className="grid gap-1 text-sm">
                    {items.map((p, i) => (
                      <li key={p.id} className="flex items-start gap-2">
                        <span className="text-muted-foreground w-4 pt-2 text-xs tabular-nums">{i + 1}</span>
                        <span className="flex-1 pt-1.5 leading-relaxed">{p.rule_text}</span>
                        <DeleteButton action={deletePrinciple.bind(null, p.id)} label="원칙 삭제" />
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
