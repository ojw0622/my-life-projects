/**
 * Database types for supabase/schema.sql.
 *
 * Hand-written in the shape produced by `supabase gen types typescript`.
 * Regenerate with the Supabase CLI once a project is linked:
 *   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Timestamps = {
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      capital_portfolios: {
        Row: Timestamps & {
          id: string;
          user_id: string;
          name: string;
          base_currency: string;
        };
        Insert: Partial<Timestamps> & {
          id?: string;
          user_id?: string;
          name: string;
          base_currency?: string;
        };
        Update: Partial<Timestamps> & {
          id?: string;
          user_id?: string;
          name?: string;
          base_currency?: string;
        };
        Relationships: [];
      };
      capital_holdings: {
        Row: Timestamps & {
          id: string;
          user_id: string;
          portfolio_id: string;
          asset_class: string;
          symbol: string | null;
          name: string;
          target_weight: number;
          quantity: number;
          lot_size: number;
          unit_price: number;
          market_value: number;
          price_updated_at: string | null;
        };
        Insert: Partial<Timestamps> & {
          id?: string;
          user_id?: string;
          portfolio_id: string;
          asset_class: string;
          symbol?: string | null;
          name: string;
          target_weight?: number;
          quantity?: number;
          lot_size?: number;
          unit_price?: number;
          price_updated_at?: string | null;
        };
        Update: Partial<Timestamps> & {
          id?: string;
          user_id?: string;
          portfolio_id?: string;
          asset_class?: string;
          symbol?: string | null;
          name?: string;
          target_weight?: number;
          quantity?: number;
          lot_size?: number;
          unit_price?: number;
          price_updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "capital_holdings_portfolio_id_fkey";
            columns: ["portfolio_id"];
            isOneToOne: false;
            referencedRelation: "capital_portfolios";
            referencedColumns: ["id"];
          },
        ];
      };
      mind_notes: {
        Row: Timestamps & {
          id: string;
          user_id: string;
          kind: "essay" | "memo";
          title: string;
          body_md: string;
          paragraphs: Json;
          tags: string[];
          written_on: string;
        };
        Insert: Partial<Timestamps> & {
          id?: string;
          user_id?: string;
          kind?: "essay" | "memo";
          title: string;
          body_md?: string;
          paragraphs?: Json;
          tags?: string[];
          written_on?: string;
        };
        Update: Partial<Timestamps> & {
          id?: string;
          user_id?: string;
          kind?: "essay" | "memo";
          title?: string;
          body_md?: string;
          paragraphs?: Json;
          tags?: string[];
          written_on?: string;
        };
        Relationships: [];
      };
      body_calisthenics_sets: {
        Row: Timestamps & {
          id: string;
          user_id: string;
          performed_on: string;
          exercise: string;
          set_number: number;
          weight_kg: number;
          reps: number;
          note: string | null;
        };
        Insert: Partial<Timestamps> & {
          id?: string;
          user_id?: string;
          performed_on?: string;
          exercise: string;
          set_number: number;
          weight_kg?: number;
          reps: number;
          note?: string | null;
        };
        Update: Partial<Timestamps> & {
          id?: string;
          user_id?: string;
          performed_on?: string;
          exercise?: string;
          set_number?: number;
          weight_kg?: number;
          reps?: number;
          note?: string | null;
        };
        Relationships: [];
      };
      body_runs: {
        Row: Timestamps & {
          id: string;
          user_id: string;
          run_on: string;
          distance_km: number;
          duration_seconds: number;
          pace_sec_per_km: number;
          avg_heart_rate: number | null;
          max_heart_rate: number | null;
          note: string | null;
        };
        Insert: Partial<Timestamps> & {
          id?: string;
          user_id?: string;
          run_on?: string;
          distance_km: number;
          duration_seconds: number;
          avg_heart_rate?: number | null;
          max_heart_rate?: number | null;
          note?: string | null;
        };
        Update: Partial<Timestamps> & {
          id?: string;
          user_id?: string;
          run_on?: string;
          distance_km?: number;
          duration_seconds?: number;
          avg_heart_rate?: number | null;
          max_heart_rate?: number | null;
          note?: string | null;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];
