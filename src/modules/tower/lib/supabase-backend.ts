import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "@/lib/supabase/database.types";

import type { DocBackend, DocData, RemoteChange, StoredDoc } from "./doc-store";

type Client = SupabaseClient<Database>;
type Row = Database["public"]["Tables"]["tower_docs"]["Row"];

/** DocStore backend over the `tower_docs` table (RLS scopes rows to the user). */
export function supabaseBackend(supabase: Client, userId: string): DocBackend {
  return {
    async list(collection) {
      const { data, error } = await supabase
        .from("tower_docs")
        .select("doc_id, data")
        .eq("collection", collection);
      if (error) throw error;
      return (data ?? []).map((r) => ({ id: r.doc_id, data: r.data as DocData }));
    },

    async upsert(docs: StoredDoc[]) {
      if (docs.length === 0) return;
      const now = new Date().toISOString();
      const { error } = await supabase.from("tower_docs").upsert(
        docs.map((d) => ({
          user_id: userId,
          collection: d.collection,
          doc_id: d.id,
          data: d.data as Json,
          updated_at: now,
        })),
        { onConflict: "user_id,collection,doc_id" },
      );
      if (error) throw error;
    },

    async remove(collection, id) {
      const { error } = await supabase
        .from("tower_docs")
        .delete()
        .eq("collection", collection)
        .eq("doc_id", id);
      if (error) throw error;
    },

    subscribe(onChange: (change: RemoteChange) => void) {
      const channel = supabase
        .channel(`tower_docs:${userId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "tower_docs", filter: `user_id=eq.${userId}` },
          (payload) => {
            if (payload.eventType === "DELETE") {
              const old = payload.old as Partial<Row>;
              if (old.collection && old.doc_id) {
                onChange({ type: "delete", collection: old.collection, id: old.doc_id });
              }
            } else {
              const row = payload.new as Row;
              onChange({ type: "upsert", collection: row.collection, id: row.doc_id, data: row.data as DocData });
            }
          },
        )
        .subscribe();
      return () => {
        void supabase.removeChannel(channel);
      };
    },
  };
}
