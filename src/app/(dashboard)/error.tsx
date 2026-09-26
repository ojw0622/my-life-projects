"use client";

import { Button } from "@/components/ui/button";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // Production builds replace server error messages with a generic React
  // error; show a readable message and keep the digest for the server logs.
  const hidden = !!error.digest || /Minified React error|react\.dev\/errors/.test(error.message);

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed py-16 text-center">
      <p className="font-medium">데이터를 불러오지 못했습니다.</p>
      <p className="text-muted-foreground max-w-md text-sm">
        {hidden ? "잠시 후 다시 시도해 주세요. 계속되면 아래 오류 코드를 알려주세요." : error.message}
      </p>
      {error.digest ? <p className="text-muted-foreground font-mono text-xs">오류 코드: {error.digest}</p> : null}
      <Button onClick={reset} variant="outline">
        다시 시도
      </Button>
    </div>
  );
}
