export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      account_plans: {
        Row: {
          plan_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          plan_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          plan_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_plans_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_ledger: {
        Row: {
          balance_after: number
          created_at: string
          delta: number
          description: string | null
          id: string
          metadata: Json
          reason: Database["public"]["Enums"]["credit_reason"]
          ref_id: string | null
          ref_type: string | null
          user_id: string
        }
        Insert: {
          balance_after: number
          created_at?: string
          delta: number
          description?: string | null
          id?: string
          metadata?: Json
          reason: Database["public"]["Enums"]["credit_reason"]
          ref_id?: string | null
          ref_type?: string | null
          user_id: string
        }
        Update: {
          balance_after?: number
          created_at?: string
          delta?: number
          description?: string | null
          id?: string
          metadata?: Json
          reason?: Database["public"]["Enums"]["credit_reason"]
          ref_id?: string | null
          ref_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      learnings: {
        Row: {
          applied_in_version_id: string | null
          cluster_key: string | null
          created_at: string
          evidence: Json
          id: string
          kind: Database["public"]["Enums"]["learning_kind"]
          package_id: string
          package_slug: string
          run_id: string | null
          suggested_patch: string | null
          user_id: string | null
          weight: number
        }
        Insert: {
          applied_in_version_id?: string | null
          cluster_key?: string | null
          created_at?: string
          evidence?: Json
          id?: string
          kind: Database["public"]["Enums"]["learning_kind"]
          package_id: string
          package_slug: string
          run_id?: string | null
          suggested_patch?: string | null
          user_id?: string | null
          weight?: number
        }
        Update: {
          applied_in_version_id?: string | null
          cluster_key?: string | null
          created_at?: string
          evidence?: Json
          id?: string
          kind?: Database["public"]["Enums"]["learning_kind"]
          package_id?: string
          package_slug?: string
          run_id?: string | null
          suggested_patch?: string | null
          user_id?: string | null
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "learnings_applied_in_version_id_fkey"
            columns: ["applied_in_version_id"]
            isOneToOne: false
            referencedRelation: "package_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learnings_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "package_rankings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learnings_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learnings_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_tokens: {
        Row: {
          created_at: string
          id: string
          last_used_at: string | null
          name: string
          prefix: string
          token_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_used_at?: string | null
          name: string
          prefix: string
          token_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_used_at?: string | null
          name?: string
          prefix?: string
          token_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      pack_customizations: {
        Row: {
          audience: string | null
          brief: string
          created_at: string
          error: string | null
          id: string
          items: Json
          niche: string | null
          pack_id: string
          research_sources: Json
          research_summary: string | null
          status: string
          updated_at: string
          user_id: string
          voice: string | null
        }
        Insert: {
          audience?: string | null
          brief: string
          created_at?: string
          error?: string | null
          id?: string
          items?: Json
          niche?: string | null
          pack_id: string
          research_sources?: Json
          research_summary?: string | null
          status?: string
          updated_at?: string
          user_id: string
          voice?: string | null
        }
        Update: {
          audience?: string | null
          brief?: string
          created_at?: string
          error?: string | null
          id?: string
          items?: Json
          niche?: string | null
          pack_id?: string
          research_sources?: Json
          research_summary?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          voice?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pack_customizations_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "packs"
            referencedColumns: ["id"]
          },
        ]
      }
      pack_items: {
        Row: {
          pack_id: string
          package_id: string
          role: string
          sort_order: number
        }
        Insert: {
          pack_id: string
          package_id: string
          role?: string
          sort_order?: number
        }
        Update: {
          pack_id?: string
          package_id?: string
          role?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "pack_items_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "packs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pack_items_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "package_rankings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pack_items_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      pack_purchases: {
        Row: {
          author_credits: number
          author_id: string | null
          buyer_id: string
          created_at: string
          credits_paid: number
          id: string
          pack_id: string
          platform_credits: number
        }
        Insert: {
          author_credits?: number
          author_id?: string | null
          buyer_id: string
          created_at?: string
          credits_paid: number
          id?: string
          pack_id: string
          platform_credits?: number
        }
        Update: {
          author_credits?: number
          author_id?: string | null
          buyer_id?: string
          created_at?: string
          credits_paid?: number
          id?: string
          pack_id?: string
          platform_credits?: number
        }
        Relationships: [
          {
            foreignKeyName: "pack_purchases_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "packs"
            referencedColumns: ["id"]
          },
        ]
      }
      package_evaluations: {
        Row: {
          adversarial_results: Json
          created_at: string
          example_results: Json
          hallucination_rate: number | null
          health_score: number | null
          id: string
          improvement_actions: Json
          overall_score: number | null
          package_id: string
          pipeline_stages: Json
          precision_score: number | null
          safety_score: number | null
          strengths: Json
          trigger_kind: string
          triggered_by: string | null
          verdict: string | null
          version_id: string | null
          weaknesses: Json
        }
        Insert: {
          adversarial_results?: Json
          created_at?: string
          example_results?: Json
          hallucination_rate?: number | null
          health_score?: number | null
          id?: string
          improvement_actions?: Json
          overall_score?: number | null
          package_id: string
          pipeline_stages?: Json
          precision_score?: number | null
          safety_score?: number | null
          strengths?: Json
          trigger_kind?: string
          triggered_by?: string | null
          verdict?: string | null
          version_id?: string | null
          weaknesses?: Json
        }
        Update: {
          adversarial_results?: Json
          created_at?: string
          example_results?: Json
          hallucination_rate?: number | null
          health_score?: number | null
          id?: string
          improvement_actions?: Json
          overall_score?: number | null
          package_id?: string
          pipeline_stages?: Json
          precision_score?: number | null
          safety_score?: number | null
          strengths?: Json
          trigger_kind?: string
          triggered_by?: string | null
          verdict?: string | null
          version_id?: string | null
          weaknesses?: Json
        }
        Relationships: []
      }
      package_imports: {
        Row: {
          created_at: string
          created_by: string | null
          generated_package_id: string | null
          id: string
          notes: string | null
          raw_input: string | null
          source_kind: string
          source_ref: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          generated_package_id?: string | null
          id?: string
          notes?: string | null
          raw_input?: string | null
          source_kind: string
          source_ref: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          generated_package_id?: string | null
          id?: string
          notes?: string | null
          raw_input?: string | null
          source_kind?: string
          source_ref?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      package_installs: {
        Row: {
          installed_at: string
          package_id: string
          user_id: string
        }
        Insert: {
          installed_at?: string
          package_id: string
          user_id: string
        }
        Update: {
          installed_at?: string
          package_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_installs_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "package_rankings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_installs_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      package_metrics_daily: {
        Row: {
          avg_hallucination: number | null
          avg_health: number | null
          avg_latency_ms: number | null
          avg_precision: number | null
          blocked_runs: number
          day: string
          error_runs: number
          ok_runs: number
          package_id: string
          runs: number
        }
        Insert: {
          avg_hallucination?: number | null
          avg_health?: number | null
          avg_latency_ms?: number | null
          avg_precision?: number | null
          blocked_runs?: number
          day: string
          error_runs?: number
          ok_runs?: number
          package_id: string
          runs?: number
        }
        Update: {
          avg_hallucination?: number | null
          avg_health?: number | null
          avg_latency_ms?: number | null
          avg_precision?: number | null
          blocked_runs?: number
          day?: string
          error_runs?: number
          ok_runs?: number
          package_id?: string
          runs?: number
        }
        Relationships: [
          {
            foreignKeyName: "package_metrics_daily_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "package_rankings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_metrics_daily_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      package_purchases: {
        Row: {
          author_credits: number
          author_id: string | null
          buyer_id: string
          created_at: string
          credits_paid: number
          id: string
          package_id: string
          platform_credits: number
        }
        Insert: {
          author_credits?: number
          author_id?: string | null
          buyer_id: string
          created_at?: string
          credits_paid: number
          id?: string
          package_id: string
          platform_credits?: number
        }
        Update: {
          author_credits?: number
          author_id?: string | null
          buyer_id?: string
          created_at?: string
          credits_paid?: number
          id?: string
          package_id?: string
          platform_credits?: number
        }
        Relationships: []
      }
      package_requests: {
        Row: {
          auto_resolved: boolean
          brief: string
          created_at: string
          evaluation: Json | null
          generated_package_id: string | null
          id: string
          industry: string | null
          kind: string
          requester_id: string | null
          research_sources: Json
          research_summary: string | null
          status: string
          updated_at: string
        }
        Insert: {
          auto_resolved?: boolean
          brief: string
          created_at?: string
          evaluation?: Json | null
          generated_package_id?: string | null
          id?: string
          industry?: string | null
          kind: string
          requester_id?: string | null
          research_sources?: Json
          research_summary?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          auto_resolved?: boolean
          brief?: string
          created_at?: string
          evaluation?: Json | null
          generated_package_id?: string | null
          id?: string
          industry?: string | null
          kind?: string
          requester_id?: string | null
          research_sources?: Json
          research_summary?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      package_versions: {
        Row: {
          compatibility: Json
          created_at: string
          examples: Json
          id: string
          live_resources: Json
          mcp_servers: Json
          notes: string | null
          package_id: string
          parent_version_id: string | null
          permissions: Json
          rules: Json
          status: Database["public"]["Enums"]["version_status"]
          system_prompt: string
          version: string
        }
        Insert: {
          compatibility?: Json
          created_at?: string
          examples?: Json
          id?: string
          live_resources?: Json
          mcp_servers?: Json
          notes?: string | null
          package_id: string
          parent_version_id?: string | null
          permissions?: Json
          rules?: Json
          status?: Database["public"]["Enums"]["version_status"]
          system_prompt: string
          version: string
        }
        Update: {
          compatibility?: Json
          created_at?: string
          examples?: Json
          id?: string
          live_resources?: Json
          mcp_servers?: Json
          notes?: string | null
          package_id?: string
          parent_version_id?: string | null
          permissions?: Json
          rules?: Json
          status?: Database["public"]["Enums"]["version_status"]
          system_prompt?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_versions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "package_rankings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_versions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_versions_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "package_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          author_handle: string
          author_id: string | null
          author_verified: boolean
          created_at: string
          description: string
          id: string
          install_count: number
          is_published: boolean
          latest_version: string
          license: string
          long_description: string | null
          name: string
          price_credits: number
          review_notes: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          scopes: string[]
          slug: string
          source_kind: string
          source_ref: string | null
          submitted_at: string | null
          type: Database["public"]["Enums"]["package_type"]
          updated_at: string
        }
        Insert: {
          author_handle?: string
          author_id?: string | null
          author_verified?: boolean
          created_at?: string
          description: string
          id?: string
          install_count?: number
          is_published?: boolean
          latest_version?: string
          license?: string
          long_description?: string | null
          name: string
          price_credits?: number
          review_notes?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          scopes?: string[]
          slug: string
          source_kind?: string
          source_ref?: string | null
          submitted_at?: string | null
          type: Database["public"]["Enums"]["package_type"]
          updated_at?: string
        }
        Update: {
          author_handle?: string
          author_id?: string | null
          author_verified?: boolean
          created_at?: string
          description?: string
          id?: string
          install_count?: number
          is_published?: boolean
          latest_version?: string
          license?: string
          long_description?: string | null
          name?: string
          price_credits?: number
          review_notes?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          scopes?: string[]
          slug?: string
          source_kind?: string
          source_ref?: string | null
          submitted_at?: string | null
          type?: Database["public"]["Enums"]["package_type"]
          updated_at?: string
        }
        Relationships: []
      }
      packs: {
        Row: {
          author_handle: string
          author_id: string | null
          cover_emoji: string | null
          created_at: string
          description: string
          id: string
          install_count: number
          is_published: boolean
          latest_version: string
          long_description: string | null
          name: string
          price_credits: number
          review_status: string
          slug: string
          theme: string
          updated_at: string
        }
        Insert: {
          author_handle?: string
          author_id?: string | null
          cover_emoji?: string | null
          created_at?: string
          description: string
          id?: string
          install_count?: number
          is_published?: boolean
          latest_version?: string
          long_description?: string | null
          name: string
          price_credits?: number
          review_status?: string
          slug: string
          theme?: string
          updated_at?: string
        }
        Update: {
          author_handle?: string
          author_id?: string | null
          cover_emoji?: string | null
          created_at?: string
          description?: string
          id?: string
          install_count?: number
          is_published?: boolean
          latest_version?: string
          long_description?: string | null
          name?: string
          price_credits?: number
          review_status?: string
          slug?: string
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_events: {
        Row: {
          created_at: string
          env: string
          event_id: string
          event_type: string
          id: string
          payload: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          env: string
          event_id: string
          event_type: string
          id?: string
          payload: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          env?: string
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string
          features: Json
          id: string
          max_installed_packages: number
          monthly_credits: number
          monthly_runs_limit: number
          name: string
          paddle_price_external_id: string | null
          paddle_product_external_id: string | null
          price_cents: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          features?: Json
          id?: string
          max_installed_packages?: number
          monthly_credits?: number
          monthly_runs_limit?: number
          name: string
          paddle_price_external_id?: string | null
          paddle_product_external_id?: string | null
          price_cents?: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          features?: Json
          id?: string
          max_installed_packages?: number
          monthly_credits?: number
          monthly_runs_limit?: number
          name?: string
          paddle_price_external_id?: string | null
          paddle_product_external_id?: string | null
          price_cents?: number
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      presets: {
        Row: {
          created_at: string
          id: string
          last_run_at: string | null
          last_run_id: string | null
          name: string
          package_slugs: string[]
          prompt: string
          tags: string[]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_run_at?: string | null
          last_run_id?: string | null
          name: string
          package_slugs?: string[]
          prompt: string
          tags?: string[]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_run_at?: string | null
          last_run_id?: string | null
          name?: string
          package_slugs?: string[]
          prompt?: string
          tags?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "presets_last_run_id_fkey"
            columns: ["last_run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          handle: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          handle?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          handle?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      report_leads: {
        Row: {
          company: string
          created_at: string
          email: string
          email_domain: string
          governance: string | null
          health_score: number | null
          id: string
          prompt: string | null
          role: string
          stack_size: number
        }
        Insert: {
          company: string
          created_at?: string
          email: string
          email_domain: string
          governance?: string | null
          health_score?: number | null
          id?: string
          prompt?: string | null
          role: string
          stack_size?: number
        }
        Update: {
          company?: string
          created_at?: string
          email?: string
          email_domain?: string
          governance?: string | null
          health_score?: number | null
          id?: string
          prompt?: string | null
          role?: string
          stack_size?: number
        }
        Relationships: []
      }
      review_audit: {
        Row: {
          created_at: string
          id: string
          kind: string
          metadata: Json
          outcome: string
          package_id: string | null
          reason: string | null
          review_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          metadata?: Json
          outcome: string
          package_id?: string | null
          reason?: string | null
          review_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json
          outcome?: string
          package_id?: string | null
          reason?: string | null
          review_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      review_reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          package_id: string
          reason: string
          reporter_id: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          review_id: string
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          package_id: string
          reason: string
          reporter_id: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          review_id: string
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          package_id?: string
          reason?: string
          reporter_id?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          review_id?: string
          status?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          body: string | null
          created_at: string
          helpful_count: number
          hidden_at: string | null
          hidden_by: string | null
          hidden_reason: string | null
          id: string
          is_hidden: boolean
          package_id: string
          rater_kind: string
          rating: number
          run_id_ref: string | null
          user_id: string
          verified_purchase: boolean
        }
        Insert: {
          body?: string | null
          created_at?: string
          helpful_count?: number
          hidden_at?: string | null
          hidden_by?: string | null
          hidden_reason?: string | null
          id?: string
          is_hidden?: boolean
          package_id: string
          rater_kind?: string
          rating: number
          run_id_ref?: string | null
          user_id: string
          verified_purchase?: boolean
        }
        Update: {
          body?: string | null
          created_at?: string
          helpful_count?: number
          hidden_at?: string | null
          hidden_by?: string | null
          hidden_reason?: string | null
          id?: string
          is_hidden?: boolean
          package_id?: string
          rater_kind?: string
          rating?: number
          run_id_ref?: string | null
          user_id?: string
          verified_purchase?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "reviews_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "package_rankings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_run_id_ref_fkey"
            columns: ["run_id_ref"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
        ]
      }
      run_events: {
        Row: {
          id: number
          kind: string
          payload: Json
          run_id: string
          ts: string
        }
        Insert: {
          id?: number
          kind: string
          payload?: Json
          run_id: string
          ts?: string
        }
        Update: {
          id?: number
          kind?: string
          payload?: Json
          run_id?: string
          ts?: string
        }
        Relationships: [
          {
            foreignKeyName: "run_events_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
        ]
      }
      runs: {
        Row: {
          ended_at: string | null
          error: string | null
          guardrail_blocks: Json | null
          hallucination_rate: number | null
          health: number | null
          id: string
          latency_ms: number | null
          output: string | null
          package_slugs: string[]
          package_versions: Json
          precision_score: number | null
          prompt: string
          started_at: string
          status: Database["public"]["Enums"]["run_status"]
          tokens_in: number | null
          tokens_out: number | null
          user_id: string
        }
        Insert: {
          ended_at?: string | null
          error?: string | null
          guardrail_blocks?: Json | null
          hallucination_rate?: number | null
          health?: number | null
          id?: string
          latency_ms?: number | null
          output?: string | null
          package_slugs?: string[]
          package_versions?: Json
          precision_score?: number | null
          prompt: string
          started_at?: string
          status?: Database["public"]["Enums"]["run_status"]
          tokens_in?: number | null
          tokens_out?: number | null
          user_id: string
        }
        Update: {
          ended_at?: string | null
          error?: string | null
          guardrail_blocks?: Json | null
          hallucination_rate?: number | null
          health?: number | null
          id?: string
          latency_ms?: number | null
          output?: string | null
          package_slugs?: string[]
          package_versions?: Json
          precision_score?: number | null
          prompt?: string
          started_at?: string
          status?: Database["public"]["Enums"]["run_status"]
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string
        }
        Relationships: []
      }
      skill_compatibility: {
        Row: {
          evaluated_at: string
          id: string
          judge_score: number | null
          model: string
          notes: string | null
          package_id: string
          package_slug: string
          pass_rate: number
          passed_cases: number
          sample: Json
          status: string
          total_cases: number
          version: string | null
        }
        Insert: {
          evaluated_at?: string
          id?: string
          judge_score?: number | null
          model: string
          notes?: string | null
          package_id: string
          package_slug: string
          pass_rate: number
          passed_cases?: number
          sample?: Json
          status: string
          total_cases?: number
          version?: string | null
        }
        Update: {
          evaluated_at?: string
          id?: string
          judge_score?: number | null
          model?: string
          notes?: string | null
          package_id?: string
          package_slug?: string
          pass_rate?: number
          passed_cases?: number
          sample?: Json
          status?: string
          total_cases?: number
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "skill_compatibility_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "package_rankings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_compatibility_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_drift_alerts: {
        Row: {
          baseline_rate: number
          baseline_runs: number
          delta: number
          detected_at: string
          id: string
          package_id: string
          package_slug: string
          rationale: string | null
          recent_rate: number
          recent_runs: number
          severity: string
          status: string
          suggested_patch: string | null
          triggered_by_model: string | null
          updated_at: string
          window_days: number
        }
        Insert: {
          baseline_rate: number
          baseline_runs: number
          delta: number
          detected_at?: string
          id?: string
          package_id: string
          package_slug: string
          rationale?: string | null
          recent_rate: number
          recent_runs: number
          severity: string
          status?: string
          suggested_patch?: string | null
          triggered_by_model?: string | null
          updated_at?: string
          window_days?: number
        }
        Update: {
          baseline_rate?: number
          baseline_runs?: number
          delta?: number
          detected_at?: string
          id?: string
          package_id?: string
          package_slug?: string
          rationale?: string | null
          recent_rate?: number
          recent_runs?: number
          severity?: string
          status?: string
          suggested_patch?: string | null
          triggered_by_model?: string | null
          updated_at?: string
          window_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "skill_drift_alerts_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "package_rankings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_drift_alerts_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_executions: {
        Row: {
          agent_fp: string | null
          created_at: string
          error_kind: string | null
          id: string
          latency_ms: number | null
          model: string | null
          package_id: string
          package_slug: string
          success: boolean
          tokens_in: number | null
          tokens_out: number | null
          user_id: string | null
          version: string | null
        }
        Insert: {
          agent_fp?: string | null
          created_at?: string
          error_kind?: string | null
          id?: string
          latency_ms?: number | null
          model?: string | null
          package_id: string
          package_slug: string
          success: boolean
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string | null
          version?: string | null
        }
        Update: {
          agent_fp?: string | null
          created_at?: string
          error_kind?: string | null
          id?: string
          latency_ms?: number | null
          model?: string | null
          package_id?: string
          package_slug?: string
          success?: boolean
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "skill_executions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "package_rankings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_executions_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_robustness_findings: {
        Row: {
          affected_version: string | null
          category: string
          code: string
          created_at: string
          details: string | null
          evidence: Json
          fixed_in_version: string | null
          id: string
          package_id: string
          package_slug: string
          published_at: string | null
          severity: string
          source: string
          status: string
          summary: string
          updated_at: string
        }
        Insert: {
          affected_version?: string | null
          category: string
          code: string
          created_at?: string
          details?: string | null
          evidence?: Json
          fixed_in_version?: string | null
          id?: string
          package_id: string
          package_slug: string
          published_at?: string | null
          severity: string
          source?: string
          status?: string
          summary: string
          updated_at?: string
        }
        Update: {
          affected_version?: string | null
          category?: string
          code?: string
          created_at?: string
          details?: string | null
          evidence?: Json
          fixed_in_version?: string | null
          id?: string
          package_id?: string
          package_slug?: string
          published_at?: string | null
          severity?: string
          source?: string
          status?: string
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_robustness_findings_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "package_rankings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_robustness_findings_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          currency: string | null
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          paddle_customer_id: string | null
          paddle_price_id: string | null
          paddle_subscription_id: string | null
          plan_slug: string
          price_cents: number | null
          price_id: string | null
          product_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          paddle_customer_id?: string | null
          paddle_price_id?: string | null
          paddle_subscription_id?: string | null
          plan_slug: string
          price_cents?: number | null
          price_id?: string | null
          product_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          paddle_customer_id?: string | null
          paddle_price_id?: string | null
          paddle_subscription_id?: string | null
          plan_slug?: string
          price_cents?: number | null
          price_id?: string | null
          product_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_mcp_connections: {
        Row: {
          args: Json
          command: string | null
          created_at: string
          env_provided: Json
          id: string
          last_run_at: string | null
          name: string
          registry_id: string
          scopes: Json
          status: string
          transport: string
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          args?: Json
          command?: string | null
          created_at?: string
          env_provided?: Json
          id?: string
          last_run_at?: string | null
          name: string
          registry_id: string
          scopes?: Json
          status?: string
          transport?: string
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          args?: Json
          command?: string | null
          created_at?: string
          env_provided?: Json
          id?: string
          last_run_at?: string | null
          name?: string
          registry_id?: string
          scopes?: Json
          status?: string
          transport?: string
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      package_rankings: {
        Row: {
          author_handle: string | null
          author_verified: boolean | null
          avg_hallucination: number | null
          avg_health: number | null
          avg_latency_ms: number | null
          avg_precision: number | null
          description: string | null
          id: string | null
          install_count: number | null
          latest_version: string | null
          name: string | null
          score: number | null
          slug: string | null
          total_runs: number | null
          type: Database["public"]["Enums"]["package_type"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      _credit_apply: {
        Args: {
          _delta: number
          _description: string
          _metadata: Json
          _reason: Database["public"]["Enums"]["credit_reason"]
          _ref_id: string
          _ref_type: string
          _user_id: string
        }
        Returns: number
      }
      compute_skill_drift: {
        Args: { _package_id: string; _window_days?: number }
        Returns: Json
      }
      get_credit_balance: { Args: { _user_id: string }; Returns: number }
      get_pack_with_items: { Args: { _slug: string }; Returns: Json }
      get_package_ratings: { Args: { _package_id: string }; Returns: Json }
      get_review_eligibility: { Args: { _package_id: string }; Returns: Json }
      get_skill_trust: { Args: { _slug: string }; Returns: Json }
      grant_signup_bonus: { Args: { _user_id: string }; Returns: undefined }
      has_active_subscription:
        | { Args: { _user_id: string }; Returns: boolean }
        | { Args: { _user_id: string; check_env?: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_package_reviews: {
        Args: { _limit?: number; _package_id: string }
        Returns: {
          avatar_url: string
          body: string
          created_at: string
          display_name: string
          id: string
          rater_kind: string
          rating: number
          user_id: string
          verified_purchase: boolean
        }[]
      }
      moderate_review: {
        Args: {
          _hide: boolean
          _reason?: string
          _resolution?: string
          _review_id: string
        }
        Returns: undefined
      }
      next_sas_code: { Args: never; Returns: string }
      purchase_pack: { Args: { _pack_id: string }; Returns: Json }
      purchase_package: { Args: { _package_id: string }; Returns: Json }
      report_review: {
        Args: { _details?: string; _reason: string; _review_id: string }
        Returns: string
      }
      report_skill_execution: {
        Args: {
          _agent_fp?: string
          _error_kind?: string
          _latency_ms?: number
          _model?: string
          _slug: string
          _success: boolean
          _tokens_in?: number
          _tokens_out?: number
          _version?: string
        }
        Returns: string
      }
      resolve_report: {
        Args: { _report_id: string; _resolution?: string; _status: string }
        Returns: undefined
      }
      seed_robustness_findings_for: {
        Args: { _package_id: string }
        Returns: number
      }
      submit_review: {
        Args: {
          _body: string
          _package_id: string
          _rater_kind: string
          _rating: number
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "publisher" | "user"
      credit_reason:
        | "signup_bonus"
        | "subscription_grant"
        | "purchase"
        | "sale"
        | "refund"
        | "manual_adjustment"
        | "promo"
      learning_kind: "miss" | "hallucination" | "win" | "suggestion" | "block"
      package_type: "skill" | "playbook" | "soul" | "guardrail"
      run_status: "running" | "ok" | "error" | "blocked"
      version_status: "stable" | "beta" | "deprecated" | "candidate"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "publisher", "user"],
      credit_reason: [
        "signup_bonus",
        "subscription_grant",
        "purchase",
        "sale",
        "refund",
        "manual_adjustment",
        "promo",
      ],
      learning_kind: ["miss", "hallucination", "win", "suggestion", "block"],
      package_type: ["skill", "playbook", "soul", "guardrail"],
      run_status: ["running", "ok", "error", "blocked"],
      version_status: ["stable", "beta", "deprecated", "candidate"],
    },
  },
} as const
