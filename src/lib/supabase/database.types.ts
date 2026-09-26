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

export type PortfolioCategory =
  | "index_etf"
  | "stock"
  | "bond"
  | "commodity"
  | "crypto"
  | "cash"
  | "other";
export type Currency = "KRW" | "USD";
export type CashFlowType = "saving" | "dividend";
export type PrincipleCategory = "investment" | "life" | "body";

export type Database = {
  public: {
    Tables: {
      portfolios: {
        Row: {
          id: string;
          user_id: string;
          asset_name: string;
          ticker: string | null;
          category: PortfolioCategory;
          currency: Currency;
          target_ratio: number;
          current_qty: number;
          avg_buy_price: number;
          current_price: number;
          tolerance_band: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          asset_name: string;
          ticker?: string | null;
          category?: PortfolioCategory;
          currency?: Currency;
          target_ratio?: number;
          current_qty?: number;
          avg_buy_price?: number;
          current_price?: number;
          tolerance_band?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          asset_name?: string;
          ticker?: string | null;
          category?: PortfolioCategory;
          currency?: Currency;
          target_ratio?: number;
          current_qty?: number;
          avg_buy_price?: number;
          current_price?: number;
          tolerance_band?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cash_flows: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          flow_type: CashFlowType;
          date: string;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          amount: number;
          flow_type: CashFlowType;
          date?: string;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          flow_type?: CashFlowType;
          date?: string;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      capital_settings: {
        Row: {
          user_id: string;
          usd_krw_rate: number;
          updated_at: string;
        };
        Insert: {
          user_id?: string;
          usd_krw_rate?: number;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          usd_krw_rate?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      essays: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          content: string;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          title: string;
          content?: string;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          content?: string;
          tags?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      principles: {
        Row: {
          id: string;
          user_id: string;
          category: PrincipleCategory;
          rule_text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          category: PrincipleCategory;
          rule_text: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category?: PrincipleCategory;
          rule_text?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      workouts: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          exercise_type: string;
          weight: number;
          reps: number;
          sets: number;
          rpe: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          date?: string;
          exercise_type: string;
          weight?: number;
          reps: number;
          sets?: number;
          rpe?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          exercise_type?: string;
          weight?: number;
          reps?: number;
          sets?: number;
          rpe?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      runs: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          distance_km: number;
          duration_minutes: number;
          avg_pace: number;
          avg_heart_rate: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          date?: string;
          distance_km: number;
          duration_minutes: number;
          avg_heart_rate?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          distance_km?: number;
          duration_minutes?: number;
          avg_heart_rate?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      tower_docs: {
        Row: {
          user_id: string;
          collection: string;
          doc_id: string;
          data: Json;
          updated_at: string;
        };
        Insert: {
          user_id?: string;
          collection: string;
          doc_id: string;
          data?: Json;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          collection?: string;
          doc_id?: string;
          data?: Json;
          updated_at?: string;
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
