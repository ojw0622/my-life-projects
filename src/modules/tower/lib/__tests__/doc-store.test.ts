import { describe, expect, it } from "vitest";

import {
  DocStore,
  newDocId,
  parseDocPath,
  type DocBackend,
  type DocData,
  type QuerySnapshot,
  type RemoteChange,
  type StoredDoc,
} from "../doc-store";

class MemoryBackend implements DocBackend {
  rows = new Map<string, Map<string, DocData>>();
  fail = false;
  lists = 0;
  push?: (c: RemoteChange) => void;

  seed(collection: string, id: string, data: DocData) {
    const m = this.rows.get(collection) ?? new Map();
    m.set(id, data);
    this.rows.set(collection, m);
  }
  async list(collection: string) {
    this.lists++;
    return [...(this.rows.get(collection) ?? new Map()).entries()].map(([id, data]) => ({ id, data: structuredClone(data) }));
  }
  async upsert(docs: StoredDoc[]) {
    if (this.fail) throw new Error("offline");
    for (const d of docs) this.seed(d.collection, d.id, structuredClone(d.data));
  }
  async remove(collection: string, id: string) {
    if (this.fail) throw new Error("offline");
    this.rows.get(collection)?.delete(id);
  }
  subscribe(onChange: (c: RemoteChange) => void) {
    this.push = onChange;
    return () => (this.push = undefined);
  }
}

const tick = () => new Promise((r) => setTimeout(r, 0));

function lastOf<T>(calls: T[]): T {
  return calls[calls.length - 1];
}

describe("parseDocPath", () => {
  it("splits collection/id and rejects anything else", () => {
    expect(parseDocPath("config/budget")).toEqual({ collection: "config", id: "budget" });
    expect(parseDocPath("weeks/2026-09-21")).toEqual({ collection: "weeks", id: "2026-09-21" });
    for (const bad of ["config", "a/b/c", "/x", "bad name/x", "items/"]) {
      expect(() => parseDocPath(bad)).toThrow();
    }
  });

  it("creates unique 20-character ids", () => {
    const ids = new Set(Array.from({ length: 200 }, newDocId));
    expect(ids.size).toBe(200);
    expect([...ids].every((id) => /^[A-Za-z0-9]{20}$/.test(id))).toBe(true);
  });
});

describe("DocStore", () => {
  it("delivers an existing document and a missing one", async () => {
    const backend = new MemoryBackend();
    backend.seed("config", "budget", { targets: { career: 12 } });
    const db = new DocStore(backend);
    const seen: { id: string; exists: boolean; data: unknown }[] = [];

    db.doc("config/budget").onSnapshot((s) => seen.push({ id: s.id, exists: s.exists, data: s.data() }));
    db.doc("config/profile").onSnapshot((s) => seen.push({ id: s.id, exists: s.exists, data: s.data() }));
    await tick();

    expect(seen).toContainEqual({ id: "budget", exists: true, data: { targets: { career: 12 } } });
    expect(seen).toContainEqual({ id: "profile", exists: false, data: undefined });
    expect(backend.lists).toBe(1); // one fetch per collection
  });

  it("set() notifies collection and document listeners before the write finishes", async () => {
    const backend = new MemoryBackend();
    const db = new DocStore(backend);
    const snaps: QuerySnapshot[] = [];
    db.collection("items").onSnapshot((s) => snaps.push(s));
    await tick();

    const write = db.collection("items").doc("a").set({ title: "한능검" });
    await tick();
    expect(lastOf(snaps).docs.map((d) => d.data())).toEqual([{ title: "한능검" }]);
    await write;
    expect(backend.rows.get("items")?.get("a")).toEqual({ title: "한능검" });
  });

  it("collection().doc() without id creates a new document", async () => {
    const backend = new MemoryBackend();
    const db = new DocStore(backend);
    const ref = db.collection("milestones").doc();
    await ref.set({ label: "전역" });
    expect(backend.rows.get("milestones")?.get(ref.id)).toEqual({ label: "전역" });
  });

  it("delete() removes the document everywhere", async () => {
    const backend = new MemoryBackend();
    backend.seed("items", "a", { title: "x" });
    const db = new DocStore(backend);
    let exists = true;
    db.doc("items/a").onSnapshot((s) => (exists = s.exists));
    await tick();
    await db.doc("items/a").delete();
    expect(exists).toBe(false);
    expect(backend.rows.get("items")?.has("a")).toBe(false);
  });

  it("orders by a field and limits like Firestore", async () => {
    const backend = new MemoryBackend();
    for (const w of ["2026-09-07", "2026-09-21", "2026-09-14", "2026-08-31"]) backend.seed("reviews", w, { weekId: w });
    const db = new DocStore(backend);
    let ids: string[] = [];
    db.collection("reviews")
      .orderBy("weekId", "desc")
      .limit(3)
      .onSnapshot((s) => (ids = s.docs.map((d) => d.id)));
    await tick();
    expect(ids).toEqual(["2026-09-21", "2026-09-14", "2026-09-07"]);
  });

  it("orders documents by id when no orderBy is given", async () => {
    const backend = new MemoryBackend();
    for (const id of ["c", "a", "b"]) backend.seed("items", id, {});
    const db = new DocStore(backend);
    let ids: string[] = [];
    db.collection("items").onSnapshot((s) => (ids = s.docs.map((d) => d.id)));
    await tick();
    expect(ids).toEqual(["a", "b", "c"]);
  });

  it("hands out copies so callers cannot mutate the cache", async () => {
    const backend = new MemoryBackend();
    backend.seed("items", "a", { checklist: [{ t: "x", done: false }] });
    const db = new DocStore(backend);
    let data: DocData | undefined;
    db.doc("items/a").onSnapshot((s) => (data = s.data()));
    await tick();
    (data!.checklist as { done: boolean }[])[0].done = true;
    let again: DocData | undefined;
    db.doc("items/a").onSnapshot((s) => (again = s.data()));
    await tick();
    expect(again).toEqual({ checklist: [{ t: "x", done: false }] });
  });

  it("rolls back and rejects when the backend write fails", async () => {
    const backend = new MemoryBackend();
    backend.seed("items", "a", { title: "old" });
    const db = new DocStore(backend);
    let title: unknown;
    db.doc("items/a").onSnapshot((s) => (title = s.data()?.title));
    await tick();

    backend.fail = true;
    await expect(db.doc("items/a").set({ title: "new" })).rejects.toThrow("offline");
    expect(title).toBe("old");
  });

  it("applies changes pushed by the backend (other devices, scheduled jobs)", async () => {
    const backend = new MemoryBackend();
    const db = new DocStore(backend);
    db.start();
    let count = 0;
    db.collection("reviews").onSnapshot((s) => (count = s.size));
    await tick();

    backend.push?.({ type: "upsert", collection: "reviews", id: "2026-09-21", data: { weekId: "2026-09-21" } });
    expect(count).toBe(1);
    backend.push?.({ type: "delete", collection: "reviews", id: "2026-09-21" });
    expect(count).toBe(0);
  });

  it("stops notifying after unsubscribe", async () => {
    const backend = new MemoryBackend();
    const db = new DocStore(backend);
    let calls = 0;
    const off = db.collection("items").onSnapshot(() => calls++);
    await tick();
    off();
    await db.doc("items/a").set({});
    expect(calls).toBe(1);
  });

  it("importDocs writes everything and refreshes watchers", async () => {
    const backend = new MemoryBackend();
    const db = new DocStore(backend);
    let items = 0;
    db.collection("items").onSnapshot((s) => (items = s.size));
    await tick();
    await db.importDocs([
      { collection: "items", id: "a", data: {} },
      { collection: "items", id: "b", data: {} },
      { collection: "config", id: "budget", data: {} },
    ]);
    expect(items).toBe(2);
    expect(backend.rows.get("config")?.has("budget")).toBe(true);
  });

  it("reports load failures to the error callback", async () => {
    const backend = new MemoryBackend();
    backend.list = async () => {
      throw new Error("denied");
    };
    const db = new DocStore(backend);
    let error: unknown;
    db.collection("items").onSnapshot(() => {}, (e) => (error = e));
    await tick();
    expect(String(error)).toContain("denied");
  });
});
