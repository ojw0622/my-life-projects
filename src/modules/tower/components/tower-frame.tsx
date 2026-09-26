"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

import { DocStore } from "../lib/doc-store";
import { snapshotToDocs } from "../lib/snapshot";
import { supabaseBackend } from "../lib/supabase-backend";

declare global {
  interface Window {
    /** Read by public/tower/app.html as its `window.claude`. */
    __towerClaude?: { use: (name: string) => Promise<DocStore | null> };
  }
}

/**
 * Hosts the original Control Tower page in an iframe (keeps its styles and
 * script untouched) and gives it a Supabase-backed `claude.use("db")`.
 */
export function TowerFrame({ userId }: { userId: string }) {
  const [store] = useState(() => new DocStore(supabaseBackend(createClient(), userId)));
  const [itemCount, setItemCount] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    store.start();
    window.__towerClaude = { use: async (name) => (name === "db" ? store : null) };
    const off = store.collection("items").onSnapshot(
      (s) => setItemCount(s.size),
      () => setFailed(true),
    );
    // Pick up changes made elsewhere (e.g. a weekly review job) when returning to the tab.
    const onVisible = () => document.visibilityState === "visible" && void store.refresh();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      off();
      document.removeEventListener("visibilitychange", onVisible);
      delete window.__towerClaude;
      store.dispose();
    };
  }, [store]);

  if (failed) {
    return (
      <p role="alert" className="text-destructive rounded-lg border border-dashed p-8 text-center text-sm">
        관제탑 데이터를 불러오지 못했습니다. 새로고침해 주세요.
      </p>
    );
  }

  // The iframe is mounted only after the first load, so the bridge above is
  // guaranteed to exist when the tower page starts.
  if (itemCount === null) {
    return <p className="text-muted-foreground p-8 text-center text-sm">관제탑을 불러오는 중…</p>;
  }

  return (
    <div className="grid gap-3">
      {itemCount === 0 ? <ImportBanner store={store} /> : null}
      <iframe
        src="/tower/app.html"
        title="지원 관제탑"
        className="bg-background h-[calc(100dvh-9rem)] min-h-[32rem] w-full rounded-lg border"
      />
    </div>
  );
}

function ImportBanner({ store }: { store: DocStore }) {
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function importFile(file: File) {
    setBusy(true);
    setMessage(null);
    try {
      const result = snapshotToDocs(JSON.parse(await file.text()));
      if (!result.ok) {
        setMessage({ ok: false, text: result.error });
        return;
      }
      await store.importDocs(result.docs);
      const summary = Object.entries(result.counts)
        .map(([c, n]) => `${c} ${n}개`)
        .join(", ");
      setMessage({ ok: true, text: `가져왔습니다: ${summary}` });
    } catch (error) {
      setMessage({
        ok: false,
        text: error instanceof SyntaxError ? "JSON 파일을 읽을 수 없습니다." : "저장하지 못했습니다. 잠시 후 다시 시도하세요.",
      });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="bg-muted/50 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm">
      <div className="grid gap-0.5">
        <p className="font-medium">기존 관제탑 데이터를 가져올까요?</p>
        <p className="text-muted-foreground text-xs">
          claude.ai 관제탑에서 내보낸 <code>data-snapshot.json</code> 파일을 선택하면 항목·일정·설정이 그대로 옮겨집니다.
        </p>
        {message ? (
          <p role="status" className={message.ok ? "text-xs" : "text-destructive text-xs"}>
            {message.text}
          </p>
        ) : null}
      </div>
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-label="스냅샷 파일 선택"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importFile(file);
        }}
      />
      <Button size="sm" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? "가져오는 중…" : "파일 선택"}
      </Button>
    </div>
  );
}
