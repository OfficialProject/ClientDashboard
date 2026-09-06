export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      benchmark_snapshots: {
        Row: {
          benchmark_id: string;
          client_id: string;
          groups: Json;
          id: string;
          overall_rank_name: string | null;
          scenario_leaderboard_ranks: Json;
          scenario_scores: Json;
          synced_at: string;
        };
        Insert: {
          benchmark_id: string;
          client_id: string;
          groups: Json;
          id?: string;
          overall_rank_name?: string | null;
          scenario_leaderboard_ranks?: Json;
          scenario_scores: Json;
          synced_at?: string;
        };
        Update: {
          benchmark_id?: string;
          client_id?: string;
          groups?: Json;
          id?: string;
          overall_rank_name?: string | null;
          scenario_leaderboard_ranks?: Json;
          scenario_scores?: Json;
          synced_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "benchmark_snapshots_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      clients: {
        Row: {
          assigned_benchmark_id: string | null;
          avatar: string | null;
          created_at: string;
          faceit_elo: number | null;
          faceit_level: number | null;
          faceit_synced_at: string | null;
          id: string;
          kovaaks_username: string | null;
          last_known_share_code: string | null;
          nickname: string;
          owner_id: string;
          premier_rating: number | null;
          steam_auth_code: string | null;
          steam_id: string;
          steam_name: string | null;
        };
        Insert: {
          assigned_benchmark_id?: string | null;
          avatar?: string | null;
          created_at?: string;
          faceit_elo?: number | null;
          faceit_level?: number | null;
          faceit_synced_at?: string | null;
          id?: string;
          kovaaks_username?: string | null;
          last_known_share_code?: string | null;
          nickname: string;
          owner_id: string;
          premier_rating?: number | null;
          steam_auth_code?: string | null;
          steam_id: string;
          steam_name?: string | null;
        };
        Update: {
          assigned_benchmark_id?: string | null;
          avatar?: string | null;
          created_at?: string;
          faceit_elo?: number | null;
          faceit_level?: number | null;
          faceit_synced_at?: string | null;
          id?: string;
          kovaaks_username?: string | null;
          last_known_share_code?: string | null;
          nickname?: string;
          owner_id?: string;
          premier_rating?: number | null;
          steam_auth_code?: string | null;
          steam_id?: string;
          steam_name?: string | null;
        };
        Relationships: [];
      };
      goals: {
        Row: {
          benchmark_id: string;
          category: string;
          client_id: string;
          created_at: string;
          id: string;
          subcategory: string;
          target_score: number;
        };
        Insert: {
          benchmark_id: string;
          category: string;
          client_id: string;
          created_at?: string;
          id?: string;
          subcategory: string;
          target_score: number;
        };
        Update: {
          benchmark_id?: string;
          category?: string;
          client_id?: string;
          created_at?: string;
          id?: string;
          subcategory?: string;
          target_score?: number;
        };
        Relationships: [
          {
            foreignKeyName: "goals_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      notes: {
        Row: { client_id: string; created_at: string; id: string; text: string };
        Insert: { client_id: string; created_at?: string; id?: string; text: string };
        Update: { client_id?: string; created_at?: string; id?: string; text?: string };
        Relationships: [
          {
            foreignKeyName: "notes_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      premier_demo_jobs: {
        Row: {
          client_id: string;
          created_at: string;
          demo_url: string | null;
          error: string | null;
          id: string;
          map: string | null;
          parse_error: string | null;
          parse_status: string;
          parsed_stats: Json | null;
          resolved_at: string | null;
          share_code: string;
          status: string;
        };
        Insert: {
          client_id: string;
          created_at?: string;
          demo_url?: string | null;
          error?: string | null;
          id?: string;
          map?: string | null;
          parse_error?: string | null;
          parse_status?: string;
          parsed_stats?: Json | null;
          resolved_at?: string | null;
          share_code: string;
          status?: string;
        };
        Update: {
          client_id?: string;
          created_at?: string;
          demo_url?: string | null;
          error?: string | null;
          id?: string;
          map?: string | null;
          parse_error?: string | null;
          parse_status?: string;
          parsed_stats?: Json | null;
          resolved_at?: string | null;
          share_code?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "premier_demo_jobs_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      routines: {
        Row: {
          benchmark_id: string;
          client_id: string;
          created_at: string;
          id: string;
          name: string;
          scenarios: Json;
          source: string;
        };
        Insert: {
          benchmark_id: string;
          client_id: string;
          created_at?: string;
          id?: string;
          name: string;
          scenarios: Json;
          source: string;
        };
        Update: {
          benchmark_id?: string;
          client_id?: string;
          created_at?: string;
          id?: string;
          name?: string;
          scenarios?: Json;
          source?: string;
        };
        Relationships: [
          {
            foreignKeyName: "routines_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      subscriptions: {
        Row: {
          owner_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          status: string;
          plan: string;
          role: string;
          updated_at: string;
        };
        Insert: {
          owner_id: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          status?: string;
          plan?: string;
          role?: string;
          updated_at?: string;
        };
        Update: {
          owner_id?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          status?: string;
          plan?: string;
          role?: string;
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
