/**
 * A small Firestore-shaped document store, the interface the Control Tower
 * page (public/tower/app.html) was written against (`claude.use("db")`):
 *
 *   db.doc("col/id")          .set(obj) .delete() .onSnapshot(cb, err)
 *   db.collection("col")      .doc(id?) .orderBy(field, dir) .limit(n) .onSnapshot(cb, err)
 *
 * Documents live in a pluggable backend (Supabase in the app, memory in
 * tests). Reads are served from an in-memory cache per collection; writes
 * update the cache first so the UI reacts instantly, then persist, and roll
 * back by reloading the collection if persisting fails.
 */

export type DocData = Record<string, unknown>;

export interface StoredDoc {
  collection: string;
  id: string;
  data: DocData;
}

export type RemoteChange =
  | { type: "upsert"; collection: string; id: string; data: DocData }
  | { type: "delete"; collection: string; id: string };

export interface DocBackend {
  list(collection: string): Promise<{ id: string; data: DocData }[]>;
  upsert(docs: StoredDoc[]): Promise<void>;
  remove(collection: string, id: string): Promise<void>;
  /** Optional push of changes made elsewhere; returns an unsubscribe. */
  subscribe?(onChange: (change: RemoteChange) => void): () => void;
}

export interface DocSnapshot {
  id: string;
  exists: boolean;
  data(): DocData | undefined;
}

export interface QuerySnapshot {
  docs: DocSnapshot[];
  size: number;
  empty: boolean;
}

type ErrorCallback = (error: unknown) => void;
type Unsubscribe = () => void;

const NAME = /^[A-Za-z0-9_-]{1,100}$/;

export function parseDocPath(path: string): { collection: string; id: string } {
  const parts = path.split("/");
  if (parts.length !== 2 || !NAME.test(parts[0]) || !parts[1] || parts[1].length > 200) {
    throw new Error(`Invalid document path "${path}" (expected "collection/id")`);
  }
  return { collection: parts[0], id: parts[1] };
}

function assertCollection(name: string): void {
  if (!NAME.test(name)) throw new Error(`Invalid collection name "${name}"`);
}

/** 20-character id like Firestore's auto ids. */
export function newDocId(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function docSnapshot(id: string, data: DocData | undefined): DocSnapshot {
  return { id, exists: data !== undefined, data: () => (data === undefined ? undefined : clone(data)) };
}

function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === undefined || a === null) return -1;
  if (b === undefined || b === null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a) < String(b) ? -1 : 1;
}

interface Query {
  collection: string;
  orderBy?: { field: string; dir: "asc" | "desc" };
  limit?: number;
}

/** Applies orderBy/limit; without orderBy, docs are ordered by id like Firestore. */
export function runQuery(docs: Map<string, DocData>, query: Query): DocSnapshot[] {
  const rows = [...docs.entries()];
  if (query.orderBy) {
    const { field, dir } = query.orderBy;
    const sign = dir === "desc" ? -1 : 1;
    rows.sort(([ia, a], [ib, b]) => sign * compareValues(a[field], b[field]) || (ia < ib ? -1 : 1));
  } else {
    rows.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  }
  const limited = query.limit === undefined ? rows : rows.slice(0, query.limit);
  return limited.map(([id, data]) => docSnapshot(id, data));
}

type Listener =
  | { kind: "doc"; id: string; cb: (s: DocSnapshot) => void; err?: ErrorCallback }
  | { kind: "query"; query: Query; cb: (s: QuerySnapshot) => void; err?: ErrorCallback };

export class DocStore {
  private cache = new Map<string, Map<string, DocData>>();
  private loading = new Map<string, Promise<Map<string, DocData>>>();
  private listeners = new Map<string, Set<Listener>>();
  private stopRemote: Unsubscribe | undefined;

  constructor(private backend: DocBackend) {}

  /** Starts receiving changes pushed by the backend. Safe to call again after dispose(). */
  start(): void {
    if (this.stopRemote) return;
    this.stopRemote = this.backend.subscribe?.((change) => this.applyRemote(change));
  }

  dispose(): void {
    this.stopRemote?.();
    this.stopRemote = undefined;
    this.listeners.clear();
  }

  doc(path: string) {
    const { collection, id } = parseDocPath(path);
    return this.docRef(collection, id);
  }

  collection(name: string) {
    assertCollection(name);
    return this.queryRef({ collection: name });
  }

  /** Writes many documents at once (used by the snapshot import). */
  async importDocs(docs: StoredDoc[]): Promise<void> {
    for (const d of docs) parseDocPath(`${d.collection}/${d.id}`);
    await this.backend.upsert(docs);
    const touched = new Set(docs.map((d) => d.collection));
    for (const c of touched) await this.reload(c);
  }

  /** Re-reads every collection someone is watching (e.g. when the tab regains focus). */
  async refresh(): Promise<void> {
    await Promise.all([...this.listeners.keys()].map((c) => this.reload(c)));
  }

  private docRef(collection: string, id: string) {
    return {
      id,
      set: (data: DocData) => this.write(collection, id, data),
      delete: () => this.write(collection, id, undefined),
      onSnapshot: (cb: (s: DocSnapshot) => void, err?: ErrorCallback): Unsubscribe =>
        this.listen(collection, { kind: "doc", id, cb, err }),
    };
  }

  private queryRef(query: Query) {
    return {
      doc: (id?: string) => this.docRef(query.collection, id ?? newDocId()),
      orderBy: (field: string, dir: "asc" | "desc" = "asc") => this.queryRef({ ...query, orderBy: { field, dir } }),
      limit: (n: number) => this.queryRef({ ...query, limit: n }),
      onSnapshot: (cb: (s: QuerySnapshot) => void, err?: ErrorCallback): Unsubscribe =>
        this.listen(query.collection, { kind: "query", query, cb, err }),
    };
  }

  private listen(collection: string, listener: Listener): Unsubscribe {
    const set = this.listeners.get(collection) ?? new Set();
    set.add(listener);
    this.listeners.set(collection, set);
    this.load(collection).then(
      (docs) => set.has(listener) && this.emit(listener, docs),
      (error) => listener.err?.(error),
    );
    return () => set.delete(listener);
  }

  private emit(listener: Listener, docs: Map<string, DocData>): void {
    if (listener.kind === "doc") {
      listener.cb(docSnapshot(listener.id, docs.get(listener.id)));
    } else {
      const snaps = runQuery(docs, listener.query);
      listener.cb({ docs: snaps, size: snaps.length, empty: snaps.length === 0 });
    }
  }

  private notify(collection: string): void {
    const docs = this.cache.get(collection);
    if (!docs) return;
    for (const listener of this.listeners.get(collection) ?? []) this.emit(listener, docs);
  }

  private load(collection: string): Promise<Map<string, DocData>> {
    const cached = this.cache.get(collection);
    if (cached) return Promise.resolve(cached);
    return this.fetch(collection);
  }

  private fetch(collection: string): Promise<Map<string, DocData>> {
    const pending = this.loading.get(collection);
    if (pending) return pending;
    const promise = this.backend
      .list(collection)
      .then((rows) => {
        const docs = new Map(rows.map((r) => [r.id, r.data]));
        this.cache.set(collection, docs);
        return docs;
      })
      .finally(() => this.loading.delete(collection));
    this.loading.set(collection, promise);
    return promise;
  }

  private async reload(collection: string): Promise<void> {
    try {
      await this.fetch(collection);
      this.notify(collection);
    } catch (error) {
      for (const l of this.listeners.get(collection) ?? []) l.err?.(error);
    }
  }

  private async write(collection: string, id: string, data: DocData | undefined): Promise<void> {
    const docs = await this.load(collection);
    if (data === undefined) docs.delete(id);
    else docs.set(id, clone(data));
    this.notify(collection);

    try {
      if (data === undefined) await this.backend.remove(collection, id);
      else await this.backend.upsert([{ collection, id, data }]);
    } catch (error) {
      await this.reload(collection);
      throw error;
    }
  }

  private applyRemote(change: RemoteChange): void {
    const docs = this.cache.get(change.collection);
    if (!docs) return;
    if (change.type === "delete") docs.delete(change.id);
    else docs.set(change.id, change.data);
    this.notify(change.collection);
  }
}
