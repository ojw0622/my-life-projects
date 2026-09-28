"use client";

import { useEffect, useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

const RAW_URL = "https://raw.githubusercontent.com/ojw0622/my-life-projects/main/supabase/schema.sql";

/**
 * Copies supabase/schema.sql in one click. The file is fetched up front so
 * the click itself can write to the clipboard synchronously (browsers only
 * allow clipboard writes right after a user action).
 */
export function CopySchemaButton({ fallbackUrl }: { fallbackUrl: string }) {
  const [sql, setSql] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "copied" | "failed">("loading");

  useEffect(() => {
    let cancelled = false;
    fetch(RAW_URL, { cache: "no-store" })
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error(String(res.status)))))
      .then((text) => {
        if (cancelled) return;
        setSql(text);
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("failed"));
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "failed") {
    return (
      <a href={fallbackUrl} target="_blank" rel="noreferrer" className="font-medium underline underline-offset-4">
        schema.sql 파일 열기
      </a>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      disabled={!sql}
      onClick={() => {
        if (!sql) return;
        navigator.clipboard.writeText(sql).then(
          () => setStatus("copied"),
          () => setStatus("failed"),
        );
      }}
    >
      {status === "copied" ? <CheckIcon /> : <CopyIcon />}
      {status === "loading" ? "불러오는 중…" : status === "copied" ? "복사됨!" : "SQL 복사하기"}
    </Button>
  );
}
