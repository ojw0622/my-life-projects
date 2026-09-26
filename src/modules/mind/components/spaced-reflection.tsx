import Link from "next/link";
import { SparklesIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { excerpt, type ReflectionPick } from "../lib/essay";

function ageLabel(days: number): string {
  if (days === 0) return "오늘";
  if (days < 30) return `${days}일 전`;
  if (days < 365) return `${Math.floor(days / 30)}개월 전`;
  return `${Math.floor(days / 365)}년 전`;
}

/** Resurfaces one past essay per day. */
export function SpacedReflection({ pick }: { pick: ReflectionPick | null }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SparklesIcon className="size-4" aria-hidden /> Spaced Reflection
        </CardTitle>
        <CardDescription>
          {pick ? `${ageLabel(pick.daysAgo)}의 나에게서` : "과거의 글을 하루 한 편 다시 꺼내 봅니다."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {pick ? (
          <>
            <Link href={`/mind/${pick.essay.id}`} className="text-lg font-medium hover:underline">
              {pick.essay.title}
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {excerpt(pick.essay.content, 220) || "본문 없음"}
            </p>
            {pick.essay.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {pick.essay.tags.map((t) => (
                  <Badge key={t} variant="secondary">
                    #{t}
                  </Badge>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <Link href="/mind/new" className="text-sm underline underline-offset-4">
            첫 에세이 쓰기
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
