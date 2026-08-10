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
      adversarial_cases: {
        Row: {
          authors: string[]
          case_id: string
          category: string
          context: string | null
          created_at: string
          expectations: Json
          id: string
          input: string
          is_active: boolean
          license: string
          references_: string[]
          severity: string
          tags: string[]
          target_package_slugs: string[]
          target_package_type: string
          target_tags: string[]
          updated_at: string
          vertical: string
        }
        Insert: {
          authors?: string[]
          case_id: string
          category: string
          context?: string | null
          created_at?: string
          expectations: Json
          id?: string
          input: string
          is_active?: boolean
          license?: string
          references_?: string[]
          severity: string
          tags?: string[]
          target_package_slugs?: string[]
          target_package_type: string
          target_tags?: string[]
          updated_at?: string
          vertical: string
        }
        Update: {
          authors?: string[]
          case_id?: string
          category?: string
          context?: string | null
          created_at?: string
          expectations?: Json
          id?: string
          input?: string
          is_active?: boolean
          license?: string
          references_?: string[]
          severity?: string
          tags?: string[]
          target_package_slugs?: string[]
          target_package_type?: string
          target_tags?: string[]
          updated_at?: string
          vertical?: string
        }
        Relationships: []
      }
      adversarial_runs: {
        Row: {
          by_category: Json
          by_severity: Json
          created_at: string
          duration_ms: number | null
          failed: number
          id: string
          judge_agreement: number | null
          judge_cases: number | null
          judge_kappa: number | null
          judge_model: string | null
          judge_overrides: number | null
          model: string | null
          outcomes: Json
          package_id: string | null
          pass_rate: number
          passed: number
          severity_weighted_score: number
          subject_arm: string
          total: number
          trigger_kind: string
          triggered_by: string | null
          version_id: string | null
          vertical_filter: string | null
        }
        Insert: {
          by_category?: Json
          by_severity?: Json
          created_at?: string
          duration_ms?: number | null
          failed: number
          id?: string
          judge_agreement?: number | null
          judge_cases?: number | null
          judge_kappa?: number | null
          judge_model?: string | null
          judge_overrides?: number | null
          model?: string | null
          outcomes?: Json
          package_id?: string | null
          pass_rate: number
          passed: number
          severity_weighted_score: number
          subject_arm?: string
          total: number
          trigger_kind?: string
          triggered_by?: string | null
          version_id?: string | null
          vertical_filter?: string | null
        }
        Update: {
          by_category?: Json
          by_severity?: Json
          created_at?: string
          duration_ms?: number | null
          failed?: number
          id?: string
          judge_agreement?: number | null
          judge_cases?: number | null
          judge_kappa?: number | null
          judge_model?: string | null
          judge_overrides?: number | null
          model?: string | null
          outcomes?: Json
          package_id?: string | null
          pass_rate?: number
          passed?: number
          severity_weighted_score?: number
          subject_arm?: string
          total?: number
          trigger_kind?: string
          triggered_by?: string | null
          version_id?: string | null
          vertical_filter?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "adversarial_runs_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "package_rankings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adversarial_runs_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adversarial_runs_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "package_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adversarial_runs_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "package_versions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_builds: {
        Row: {
          brief: Json
          created_at: string
          emoji: string
          error: string | null
          grade: string | null
          guardrails: Json
          id: string
          name: string
          playbooks: Json
          report: Json | null
          research_sources: Json
          research_summary: string | null
          role: string
          score: number | null
          skills: Json
          slug: string
          soul: string | null
          status: string
          step: string | null
          tagline: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brief?: Json
          created_at?: string
          emoji?: string
          error?: string | null
          grade?: string | null
          guardrails?: Json
          id?: string
          name: string
          playbooks?: Json
          report?: Json | null
          research_sources?: Json
          research_summary?: string | null
          role: string
          score?: number | null
          skills?: Json
          slug: string
          soul?: string | null
          status?: string
          step?: string | null
          tagline?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brief?: Json
          created_at?: string
          emoji?: string
          error?: string | null
          grade?: string | null
          guardrails?: Json
          id?: string
          name?: string
          playbooks?: Json
          report?: Json | null
          research_sources?: Json
          research_summary?: string | null
          role?: string
          score?: number | null
          skills?: Json
          slug?: string
          soul?: string | null
          status?: string
          step?: string | null
          tagline?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      agent_credentials: {
        Row: {
          code: string
          created_at: string
          domain: string
          expires_at: string
          focus: Json
          id: string
          issued_at: string
          residency_id: string | null
          revoked: boolean
          rounds: number
          score: number
          signature: string
          user_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          domain: string
          expires_at: string
          focus?: Json
          id?: string
          issued_at?: string
          residency_id?: string | null
          revoked?: boolean
          rounds?: number
          score: number
          signature: string
          user_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          domain?: string
          expires_at?: string
          focus?: Json
          id?: string
          issued_at?: string
          residency_id?: string | null
          revoked?: boolean
          rounds?: number
          score?: number
          signature?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_credentials_residency_id_fkey"
            columns: ["residency_id"]
            isOneToOne: false
            referencedRelation: "agent_residencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_diagnoses: {
        Row: {
          agent_fp: string | null
          bottleneck: string | null
          case_ids: string[]
          created_at: string
          domain: string
          error_profile: Json
          id: string
          installed_skills: string[]
          overall_score: number | null
          prescription: Json
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agent_fp?: string | null
          bottleneck?: string | null
          case_ids?: string[]
          created_at?: string
          domain: string
          error_profile?: Json
          id?: string
          installed_skills?: string[]
          overall_score?: number | null
          prescription?: Json
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agent_fp?: string | null
          bottleneck?: string | null
          case_ids?: string[]
          created_at?: string
          domain?: string
          error_profile?: Json
          id?: string
          installed_skills?: string[]
          overall_score?: number | null
          prescription?: Json
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      agent_diagnosis_items: {
        Row: {
          answer: string | null
          case_id: string
          created_at: string
          diagnosis_id: string
          error_class: string
          id: string
          latency_ms: number | null
          passed: boolean
          reason: string | null
          tokens: number | null
        }
        Insert: {
          answer?: string | null
          case_id: string
          created_at?: string
          diagnosis_id: string
          error_class: string
          id?: string
          latency_ms?: number | null
          passed?: boolean
          reason?: string | null
          tokens?: number | null
        }
        Update: {
          answer?: string | null
          case_id?: string
          created_at?: string
          diagnosis_id?: string
          error_class?: string
          id?: string
          latency_ms?: number | null
          passed?: boolean
          reason?: string | null
          tokens?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_diagnosis_items_diagnosis_id_fkey"
            columns: ["diagnosis_id"]
            isOneToOne: false
            referencedRelation: "agent_diagnoses"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_onboarding_steps: {
        Row: {
          client_name: string | null
          created_at: string
          evidence: Json
          id: string
          is_bot: boolean
          session_hash: string
          stage: string
          step_id: string
          ua_family: string | null
        }
        Insert: {
          client_name?: string | null
          created_at?: string
          evidence?: Json
          id?: string
          is_bot?: boolean
          session_hash: string
          stage: string
          step_id: string
          ua_family?: string | null
        }
        Update: {
          client_name?: string | null
          created_at?: string
          evidence?: Json
          id?: string
          is_bot?: boolean
          session_hash?: string
          stage?: string
          step_id?: string
          ua_family?: string | null
        }
        Relationships: []
      }
      agent_residencies: {
        Row: {
          agent_fp: string | null
          created_at: string
          current_case_ids: Json
          domain: string
          focus: Json
          id: string
          installed_skills: Json
          pass_threshold: number
          round: number
          round_scores: Json
          status: string
          total_rounds: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agent_fp?: string | null
          created_at?: string
          current_case_ids?: Json
          domain: string
          focus?: Json
          id?: string
          installed_skills?: Json
          pass_threshold?: number
          round?: number
          round_scores?: Json
          status?: string
          total_rounds?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agent_fp?: string | null
          created_at?: string
          current_case_ids?: Json
          domain?: string
          focus?: Json
          id?: string
          installed_skills?: Json
          pass_threshold?: number
          round?: number
          round_scores?: Json
          status?: string
          total_rounds?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      agent_residency_rounds: {
        Row: {
          created_at: string
          feedback: Json
          id: string
          passed: boolean
          residency_id: string
          round: number
          score: number
        }
        Insert: {
          created_at?: string
          feedback?: Json
          id?: string
          passed?: boolean
          residency_id: string
          round: number
          score: number
        }
        Update: {
          created_at?: string
          feedback?: Json
          id?: string
          passed?: boolean
          residency_id?: string
          round?: number
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "agent_residency_rounds_residency_id_fkey"
            columns: ["residency_id"]
            isOneToOne: false
            referencedRelation: "agent_residencies"
            referencedColumns: ["id"]
          },
        ]
      }
      cloud_skill_versions: {
        Row: {
          changelog: string | null
          cloud_skill_id: string
          content: string
          created_at: string
          id: string
          variables: Json
          version: number
        }
        Insert: {
          changelog?: string | null
          cloud_skill_id: string
          content: string
          created_at?: string
          id?: string
          variables?: Json
          version: number
        }
        Update: {
          changelog?: string | null
          cloud_skill_id?: string
          content?: string
          created_at?: string
          id?: string
          variables?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "cloud_skill_versions_cloud_skill_id_fkey"
            columns: ["cloud_skill_id"]
            isOneToOne: false
            referencedRelation: "cloud_skills"
            referencedColumns: ["id"]
          },
        ]
      }
      cloud_skills: {
        Row: {
          category: string
          content: string
          created_at: string
          description: string | null
          forked_from: string | null
          id: string
          is_public: boolean
          name: string
          slug: string
          tags: string[]
          updated_at: string
          user_id: string
          variables: Json
          version: number
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          description?: string | null
          forked_from?: string | null
          id?: string
          is_public?: boolean
          name: string
          slug: string
          tags?: string[]
          updated_at?: string
          user_id: string
          variables?: Json
          version?: number
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          description?: string | null
          forked_from?: string | null
          id?: string
          is_public?: boolean
          name?: string
          slug?: string
          tags?: string[]
          updated_at?: string
          user_id?: string
          variables?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "cloud_skills_forked_from_fkey"
            columns: ["forked_from"]
            isOneToOne: false
            referencedRelation: "cloud_skills"
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
      crm_copy_variants: {
        Row: {
          created_at: string
          framing: string
          heading_override: string | null
          id: string
          intro_override: string | null
          label: string
          notes: string | null
          origin: string
          status: string
          subject_override: string | null
          trigger: string
          updated_at: string
          variant: string
        }
        Insert: {
          created_at?: string
          framing?: string
          heading_override?: string | null
          id?: string
          intro_override?: string | null
          label: string
          notes?: string | null
          origin?: string
          status?: string
          subject_override?: string | null
          trigger: string
          updated_at?: string
          variant: string
        }
        Update: {
          created_at?: string
          framing?: string
          heading_override?: string | null
          id?: string
          intro_override?: string | null
          label?: string
          notes?: string | null
          origin?: string
          status?: string
          subject_override?: string | null
          trigger?: string
          updated_at?: string
          variant?: string
        }
        Relationships: []
      }
      crm_lifecycle_state: {
        Row: {
          created_at: string
          crm_unsubscribed: boolean
          emails_sent_7d: number
          first_seen: string
          last_active_at: string | null
          last_email_at: string | null
          stage: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          crm_unsubscribed?: boolean
          emails_sent_7d?: number
          first_seen?: string
          last_active_at?: string | null
          last_email_at?: string | null
          stage?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          crm_unsubscribed?: boolean
          emails_sent_7d?: number
          first_seen?: string
          last_active_at?: string | null
          last_email_at?: string | null
          stage?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      crm_message_log: {
        Row: {
          channel: string
          created_at: string
          cta_path: string | null
          id: string
          message_id: string | null
          recipient_email: string | null
          roi_snapshot: Json
          send_hour: number | null
          stage_at_send: string | null
          template: string
          tracking_token: string | null
          trigger: string
          user_id: string
          variant: string
        }
        Insert: {
          channel?: string
          created_at?: string
          cta_path?: string | null
          id?: string
          message_id?: string | null
          recipient_email?: string | null
          roi_snapshot?: Json
          send_hour?: number | null
          stage_at_send?: string | null
          template: string
          tracking_token?: string | null
          trigger: string
          user_id: string
          variant?: string
        }
        Update: {
          channel?: string
          created_at?: string
          cta_path?: string | null
          id?: string
          message_id?: string | null
          recipient_email?: string | null
          roi_snapshot?: Json
          send_hour?: number | null
          stage_at_send?: string | null
          template?: string
          tracking_token?: string | null
          trigger?: string
          user_id?: string
          variant?: string
        }
        Relationships: []
      }
      crm_message_outcomes: {
        Row: {
          clicked_at: string | null
          complained_at: string | null
          conversion_kind: string | null
          converted_at: string | null
          created_at: string
          id: string
          message_log_id: string
          opened_at: string | null
          scored_at: string | null
          send_hour: number | null
          trigger: string
          unsubscribed_at: string | null
          updated_at: string
          user_id: string
          variant: string
          window_closed: boolean
        }
        Insert: {
          clicked_at?: string | null
          complained_at?: string | null
          conversion_kind?: string | null
          converted_at?: string | null
          created_at?: string
          id?: string
          message_log_id: string
          opened_at?: string | null
          scored_at?: string | null
          send_hour?: number | null
          trigger: string
          unsubscribed_at?: string | null
          updated_at?: string
          user_id: string
          variant?: string
          window_closed?: boolean
        }
        Update: {
          clicked_at?: string | null
          complained_at?: string | null
          conversion_kind?: string | null
          converted_at?: string | null
          created_at?: string
          id?: string
          message_log_id?: string
          opened_at?: string | null
          scored_at?: string | null
          send_hour?: number | null
          trigger?: string
          unsubscribed_at?: string | null
          updated_at?: string
          user_id?: string
          variant?: string
          window_closed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "crm_message_outcomes_message_log_id_fkey"
            columns: ["message_log_id"]
            isOneToOne: true
            referencedRelation: "crm_message_log"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      crm_tuning_log: {
        Row: {
          action: string
          created_at: string
          id: string
          reason: string
          stats: Json
          trigger: string | null
          variant: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          reason: string
          stats?: Json
          trigger?: string | null
          variant?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          reason?: string
          stats?: Json
          trigger?: string | null
          variant?: string | null
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      enterprise_requests: {
        Row: {
          admin_notes: string | null
          checklist: Json
          company: string
          contact_name: string
          created_at: string
          id: string
          ip_concerns: string | null
          nda_accepted: boolean
          nda_accepted_at: string | null
          nda_ip: string | null
          nda_required: boolean
          nda_signer_name: string | null
          role: string | null
          status: string
          team_size: string | null
          updated_at: string
          use_case: string
          user_id: string | null
          work_email: string
        }
        Insert: {
          admin_notes?: string | null
          checklist?: Json
          company: string
          contact_name: string
          created_at?: string
          id?: string
          ip_concerns?: string | null
          nda_accepted?: boolean
          nda_accepted_at?: string | null
          nda_ip?: string | null
          nda_required?: boolean
          nda_signer_name?: string | null
          role?: string | null
          status?: string
          team_size?: string | null
          updated_at?: string
          use_case: string
          user_id?: string | null
          work_email: string
        }
        Update: {
          admin_notes?: string | null
          checklist?: Json
          company?: string
          contact_name?: string
          created_at?: string
          id?: string
          ip_concerns?: string | null
          nda_accepted?: boolean
          nda_accepted_at?: string | null
          nda_ip?: string | null
          nda_required?: boolean
          nda_signer_name?: string | null
          role?: string | null
          status?: string
          team_size?: string | null
          updated_at?: string
          use_case?: string
          user_id?: string | null
          work_email?: string
        }
        Relationships: []
      }
      external_certifications: {
        Row: {
          content_sha256: string
          created_at: string
          engine_version: string
          grade: string
          id: string
          name: string
          overall_score: number
          report: Json
          type: string
        }
        Insert: {
          content_sha256: string
          created_at?: string
          engine_version: string
          grade: string
          id?: string
          name: string
          overall_score: number
          report?: Json
          type: string
        }
        Update: {
          content_sha256?: string
          created_at?: string
          engine_version?: string
          grade?: string
          id?: string
          name?: string
          overall_score?: number
          report?: Json
          type?: string
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
            foreignKeyName: "learnings_applied_in_version_id_fkey"
            columns: ["applied_in_version_id"]
            isOneToOne: false
            referencedRelation: "package_versions_public"
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
      mcp_call_log: {
        Row: {
          created_at: string
          id: string
          identity: string
          is_write: boolean
          tool_name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          identity: string
          is_write?: boolean
          tool_name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          identity?: string
          is_write?: boolean
          tool_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      mcp_funnel_events: {
        Row: {
          anon_hash: string | null
          client_id: string | null
          client_name: string | null
          created_at: string
          event: string
          id: number
          props: Json
          user_id: string | null
        }
        Insert: {
          anon_hash?: string | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          event: string
          id?: number
          props?: Json
          user_id?: string | null
        }
        Update: {
          anon_hash?: string | null
          client_id?: string | null
          client_name?: string | null
          created_at?: string
          event?: string
          id?: number
          props?: Json
          user_id?: string | null
        }
        Relationships: []
      }
      mcp_idempotency: {
        Row: {
          created_at: string
          expires_at: string
          key_hash: string
          response: Json
          tool: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          key_hash: string
          response: Json
          tool: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          key_hash?: string
          response?: Json
          tool?: string
          user_id?: string
        }
        Relationships: []
      }
      mcp_oauth_authorizations: {
        Row: {
          client_id: string
          code_challenge: string
          code_challenge_method: string
          code_hash: string
          created_at: string
          expires_at: string
          redirect_uri: string
          scope: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          client_id: string
          code_challenge: string
          code_challenge_method?: string
          code_hash: string
          created_at?: string
          expires_at: string
          redirect_uri: string
          scope: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          client_id?: string
          code_challenge?: string
          code_challenge_method?: string
          code_hash?: string
          created_at?: string
          expires_at?: string
          redirect_uri?: string
          scope?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_oauth_authorizations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "mcp_oauth_clients"
            referencedColumns: ["client_id"]
          },
        ]
      }
      mcp_oauth_clients: {
        Row: {
          client_id: string
          client_name: string
          client_uri: string | null
          created_at: string
          created_ip: string | null
          grant_types: string[]
          logo_uri: string | null
          redirect_uris: string[]
          response_types: string[]
          scope: string
          software_id: string | null
          software_version: string | null
          token_endpoint_auth_method: string
        }
        Insert: {
          client_id: string
          client_name?: string
          client_uri?: string | null
          created_at?: string
          created_ip?: string | null
          grant_types?: string[]
          logo_uri?: string | null
          redirect_uris: string[]
          response_types?: string[]
          scope?: string
          software_id?: string | null
          software_version?: string | null
          token_endpoint_auth_method?: string
        }
        Update: {
          client_id?: string
          client_name?: string
          client_uri?: string | null
          created_at?: string
          created_ip?: string | null
          grant_types?: string[]
          logo_uri?: string | null
          redirect_uris?: string[]
          response_types?: string[]
          scope?: string
          software_id?: string | null
          software_version?: string | null
          token_endpoint_auth_method?: string
        }
        Relationships: []
      }
      mcp_oauth_tokens: {
        Row: {
          client_id: string
          created_at: string
          expires_at: string
          kind: string
          last_used_at: string | null
          parent_token_hash: string | null
          revoked_at: string | null
          scope: string
          token_hash: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          expires_at: string
          kind: string
          last_used_at?: string | null
          parent_token_hash?: string | null
          revoked_at?: string | null
          scope: string
          token_hash: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          expires_at?: string
          kind?: string
          last_used_at?: string | null
          parent_token_hash?: string | null
          revoked_at?: string | null
          scope?: string
          token_hash?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_oauth_tokens_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "mcp_oauth_clients"
            referencedColumns: ["client_id"]
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
      newsletter_signups: {
        Row: {
          created_at: string
          email: string
          id: string
          source: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          source?: string | null
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
          efficiency: Json | null
          evolution_trace: Json | null
          example_results: Json
          hallucination_rate: number | null
          health_score: number | null
          id: string
          improvement_actions: Json
          judge_calibration: Json | null
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
          efficiency?: Json | null
          evolution_trace?: Json | null
          example_results?: Json
          hallucination_rate?: number | null
          health_score?: number | null
          id?: string
          improvement_actions?: Json
          judge_calibration?: Json | null
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
          efficiency?: Json | null
          evolution_trace?: Json | null
          example_results?: Json
          hallucination_rate?: number | null
          health_score?: number | null
          id?: string
          improvement_actions?: Json
          judge_calibration?: Json | null
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
      package_feedback: {
        Row: {
          agent_model: string | null
          comments: string | null
          context: Json
          created_at: string
          id: string
          kind: string | null
          package_id: string | null
          rating: number | null
          request_id: string | null
          sentiment: string | null
          source: string
          submitter_id: string | null
        }
        Insert: {
          agent_model?: string | null
          comments?: string | null
          context?: Json
          created_at?: string
          id?: string
          kind?: string | null
          package_id?: string | null
          rating?: number | null
          request_id?: string | null
          sentiment?: string | null
          source: string
          submitter_id?: string | null
        }
        Update: {
          agent_model?: string | null
          comments?: string | null
          context?: Json
          created_at?: string
          id?: string
          kind?: string | null
          package_id?: string | null
          rating?: number | null
          request_id?: string | null
          sentiment?: string | null
          source?: string
          submitter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "package_feedback_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "package_rankings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_feedback_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_feedback_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "package_feedback_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      package_feedback_requests: {
        Row: {
          context: Json
          created_at: string
          expires_at: string
          fulfilled_at: string | null
          id: string
          kind: string
          package_id: string | null
          source: string
          source_user_id: string | null
          version_id: string | null
        }
        Insert: {
          context?: Json
          created_at?: string
          expires_at?: string
          fulfilled_at?: string | null
          id?: string
          kind: string
          package_id?: string | null
          source?: string
          source_user_id?: string | null
          version_id?: string | null
        }
        Update: {
          context?: Json
          created_at?: string
          expires_at?: string
          fulfilled_at?: string | null
          id?: string
          kind?: string
          package_id?: string | null
          source?: string
          source_user_id?: string | null
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "package_feedback_requests_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "package_rankings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_feedback_requests_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_feedback_requests_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "package_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_feedback_requests_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "package_versions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      package_golden_cases: {
        Row: {
          created_at: string
          created_by: string | null
          expected_output: string
          frozen: boolean
          id: string
          input: string
          is_active: boolean
          label_pass: boolean
          label_source: string
          origin_version_id: string | null
          package_id: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expected_output: string
          frozen?: boolean
          id?: string
          input: string
          is_active?: boolean
          label_pass?: boolean
          label_source?: string
          origin_version_id?: string | null
          package_id: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expected_output?: string
          frozen?: boolean
          id?: string
          input?: string
          is_active?: boolean
          label_pass?: boolean
          label_source?: string
          origin_version_id?: string | null
          package_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_golden_cases_origin_version_id_fkey"
            columns: ["origin_version_id"]
            isOneToOne: false
            referencedRelation: "package_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_golden_cases_origin_version_id_fkey"
            columns: ["origin_version_id"]
            isOneToOne: false
            referencedRelation: "package_versions_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_golden_cases_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "package_rankings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_golden_cases_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
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
          updated_at: string
          user_id: string
          version: string | null
        }
        Insert: {
          installed_at?: string
          package_id: string
          updated_at?: string
          user_id: string
          version?: string | null
        }
        Update: {
          installed_at?: string
          package_id?: string
          updated_at?: string
          user_id?: string
          version?: string | null
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
      package_releases: {
        Row: {
          content_hash: string
          id: string
          package_id: string
          signature: string
          signed_at: string
          signed_by: string | null
          signing_key_id: string
          version: string
          version_id: string
        }
        Insert: {
          content_hash: string
          id?: string
          package_id: string
          signature: string
          signed_at?: string
          signed_by?: string | null
          signing_key_id: string
          version: string
          version_id: string
        }
        Update: {
          content_hash?: string
          id?: string
          package_id?: string
          signature?: string
          signed_at?: string
          signed_by?: string | null
          signing_key_id?: string
          version?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_releases_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "package_rankings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_releases_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_releases_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "package_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_releases_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "package_versions_public"
            referencedColumns: ["id"]
          },
        ]
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
      package_stars: {
        Row: {
          created_at: string
          package_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          package_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          package_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_stars_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "package_rankings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_stars_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      package_trust_scores: {
        Row: {
          adversarial_pass_rate: number | null
          adversarial_weighted_score: number | null
          age_days: number | null
          components: Json
          computed_at: string
          confidence: number | null
          dim_competence: number | null
          dim_coverage: number | null
          dim_freshness: number | null
          dim_safety: number | null
          package_id: string
          real_world_success_rate: number | null
          schema_valid: boolean
          score: number
          signed_releases: number
          trust_version: string
          verified: boolean
        }
        Insert: {
          adversarial_pass_rate?: number | null
          adversarial_weighted_score?: number | null
          age_days?: number | null
          components?: Json
          computed_at?: string
          confidence?: number | null
          dim_competence?: number | null
          dim_coverage?: number | null
          dim_freshness?: number | null
          dim_safety?: number | null
          package_id: string
          real_world_success_rate?: number | null
          schema_valid: boolean
          score: number
          signed_releases?: number
          trust_version?: string
          verified?: boolean
        }
        Update: {
          adversarial_pass_rate?: number | null
          adversarial_weighted_score?: number | null
          age_days?: number | null
          components?: Json
          computed_at?: string
          confidence?: number | null
          dim_competence?: number | null
          dim_coverage?: number | null
          dim_freshness?: number | null
          dim_safety?: number | null
          package_id?: string
          real_world_success_rate?: number | null
          schema_valid?: boolean
          score?: number
          signed_releases?: number
          trust_version?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "package_trust_scores_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: true
            referencedRelation: "package_rankings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_trust_scores_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: true
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      package_upload_jobs: {
        Row: {
          attempts: number
          content: string
          created_at: string
          error: string | null
          filename: string
          finished_at: string | null
          id: string
          inferred_type: string | null
          package_id: string | null
          result: Json | null
          slug: string | null
          started_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          attempts?: number
          content: string
          created_at?: string
          error?: string | null
          filename: string
          finished_at?: string | null
          id?: string
          inferred_type?: string | null
          package_id?: string | null
          result?: Json | null
          slug?: string | null
          started_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          attempts?: number
          content?: string
          created_at?: string
          error?: string | null
          filename?: string
          finished_at?: string | null
          id?: string
          inferred_type?: string | null
          package_id?: string | null
          result?: Json | null
          slug?: string | null
          started_at?: string | null
          status?: string
          user_id?: string
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
          {
            foreignKeyName: "package_versions_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "package_versions_public"
            referencedColumns: ["id"]
          },
        ]
      }
      package_weekly_metrics: {
        Row: {
          adversarial_pass_rate: number | null
          adversarial_weighted: number | null
          avg_tokens: number | null
          created_at: string
          id: number
          p95_latency_ms: number | null
          package_id: string
          package_slug: string
          runs: number
          success_rate: number | null
          success_rate_wilson_lb: number | null
          successes: number
          task_completed_rate: number | null
          track: string
          trust_score: number | null
          week_start: string
        }
        Insert: {
          adversarial_pass_rate?: number | null
          adversarial_weighted?: number | null
          avg_tokens?: number | null
          created_at?: string
          id?: number
          p95_latency_ms?: number | null
          package_id: string
          package_slug: string
          runs?: number
          success_rate?: number | null
          success_rate_wilson_lb?: number | null
          successes?: number
          task_completed_rate?: number | null
          track?: string
          trust_score?: number | null
          week_start: string
        }
        Update: {
          adversarial_pass_rate?: number | null
          adversarial_weighted?: number | null
          avg_tokens?: number | null
          created_at?: string
          id?: number
          p95_latency_ms?: number | null
          package_id?: string
          package_slug?: string
          runs?: number
          success_rate?: number | null
          success_rate_wilson_lb?: number | null
          successes?: number
          task_completed_rate?: number | null
          track?: string
          trust_score?: number | null
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_weekly_metrics_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "package_rankings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_weekly_metrics_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
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
          search_vector: unknown
          slug: string
          source_kind: string
          source_ref: string | null
          star_count: number
          submitted_at: string | null
          tags: string[]
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
          search_vector?: unknown
          slug: string
          source_kind?: string
          source_ref?: string | null
          star_count?: number
          submitted_at?: string | null
          tags?: string[]
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
          search_vector?: unknown
          slug?: string
          source_kind?: string
          source_ref?: string | null
          star_count?: number
          submitted_at?: string | null
          tags?: string[]
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
      referral_clicks: {
        Row: {
          code: string
          created_at: string
          id: number
          ip_hash: string | null
          target: string | null
          ua_hash: string | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: number
          ip_hash?: string | null
          target?: string | null
          ua_hash?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: number
          ip_hash?: string | null
          target?: string | null
          ua_hash?: string | null
        }
        Relationships: []
      }
      referral_rewards: {
        Row: {
          created_at: string
          credits: number
          id: string
          kind: string
          referral_id: string
          referrer_id: string
        }
        Insert: {
          created_at?: string
          credits: number
          id?: string
          kind: string
          referral_id: string
          referrer_id: string
        }
        Update: {
          created_at?: string
          credits?: number
          id?: string
          kind?: string
          referral_id?: string
          referrer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_rewards_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          code: string
          created_at: string
          first_purchase_at: string | null
          id: string
          package_slug: string | null
          referred_user_id: string
          referrer_id: string
          signed_up_at: string
          source_url: string | null
          status: string
          subscribed_at: string | null
        }
        Insert: {
          code: string
          created_at?: string
          first_purchase_at?: string | null
          id?: string
          package_slug?: string | null
          referred_user_id: string
          referrer_id: string
          signed_up_at?: string
          source_url?: string | null
          status?: string
          subscribed_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          first_purchase_at?: string | null
          id?: string
          package_slug?: string | null
          referred_user_id?: string
          referrer_id?: string
          signed_up_at?: string
          source_url?: string | null
          status?: string
          subscribed_at?: string | null
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
      share_promos: {
        Row: {
          body: string
          description: string | null
          generated_at: string
          name: string | null
          slug: string
          source: string
          type: string
        }
        Insert: {
          body: string
          description?: string | null
          generated_at?: string
          name?: string | null
          slug: string
          source?: string
          type: string
        }
        Update: {
          body?: string
          description?: string | null
          generated_at?: string
          name?: string | null
          slug?: string
          source?: string
          type?: string
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
          arm: string | null
          baseline_latency_ms: number | null
          baseline_tokens: number | null
          created_at: string
          error_kind: string | null
          experiment_key: string | null
          human_intervention: boolean | null
          id: string
          latency_ms: number | null
          model: string | null
          package_id: string
          package_slug: string
          success: boolean
          task_completed: boolean | null
          tokens_in: number | null
          tokens_out: number | null
          user_id: string | null
          user_rating: number | null
          version: string | null
          workspace_hash: string | null
        }
        Insert: {
          agent_fp?: string | null
          arm?: string | null
          baseline_latency_ms?: number | null
          baseline_tokens?: number | null
          created_at?: string
          error_kind?: string | null
          experiment_key?: string | null
          human_intervention?: boolean | null
          id?: string
          latency_ms?: number | null
          model?: string | null
          package_id: string
          package_slug: string
          success: boolean
          task_completed?: boolean | null
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string | null
          user_rating?: number | null
          version?: string | null
          workspace_hash?: string | null
        }
        Update: {
          agent_fp?: string | null
          arm?: string | null
          baseline_latency_ms?: number | null
          baseline_tokens?: number | null
          created_at?: string
          error_kind?: string | null
          experiment_key?: string | null
          human_intervention?: boolean | null
          id?: string
          latency_ms?: number | null
          model?: string | null
          package_id?: string
          package_slug?: string
          success?: boolean
          task_completed?: boolean | null
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string | null
          user_rating?: number | null
          version?: string | null
          workspace_hash?: string | null
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
      skill_experiments: {
        Row: {
          control_share: number
          created_at: string
          created_by: string | null
          ended_at: string | null
          hypothesis: string | null
          id: string
          key: string
          package_id: string | null
          package_slug: string
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          control_share?: number
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          hypothesis?: string | null
          id?: string
          key: string
          package_id?: string | null
          package_slug: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          control_share?: number
          created_at?: string
          created_by?: string | null
          ended_at?: string | null
          hypothesis?: string | null
          id?: string
          key?: string
          package_id?: string | null
          package_slug?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "skill_experiments_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "package_rankings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skill_experiments_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_review_runs: {
        Row: {
          created_at: string
          doc_class: string | null
          doc_hash: string
          doc_key: string
          doc_type: string
          format_score: number | null
          grade: string | null
          id: string
          language: string | null
          overall_score: number
          substance_score: number | null
          user_id: string
          verdict_score: number | null
        }
        Insert: {
          created_at?: string
          doc_class?: string | null
          doc_hash: string
          doc_key: string
          doc_type?: string
          format_score?: number | null
          grade?: string | null
          id?: string
          language?: string | null
          overall_score: number
          substance_score?: number | null
          user_id: string
          verdict_score?: number | null
        }
        Update: {
          created_at?: string
          doc_class?: string | null
          doc_hash?: string
          doc_key?: string
          doc_type?: string
          format_score?: number | null
          grade?: string | null
          id?: string
          language?: string | null
          overall_score?: number
          substance_score?: number | null
          user_id?: string
          verdict_score?: number | null
        }
        Relationships: []
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
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
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
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
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
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tenant_encrypted_objects: {
        Row: {
          byte_size: number
          ciphertext: string
          created_at: string
          id: string
          key_id: string
          kind: string
          plaintext_sha256: string
          ref: string
          updated_at: string
          user_id: string
        }
        Insert: {
          byte_size?: number
          ciphertext: string
          created_at?: string
          id?: string
          key_id: string
          kind?: string
          plaintext_sha256: string
          ref: string
          updated_at?: string
          user_id: string
        }
        Update: {
          byte_size?: number
          ciphertext?: string
          created_at?: string
          id?: string
          key_id?: string
          kind?: string
          plaintext_sha256?: string
          ref?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_encrypted_objects_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "tenant_encryption_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_encryption_keys: {
        Row: {
          alias: string
          created_at: string
          fingerprint: string
          id: string
          kdf_salt: string
          revoked_at: string | null
          rotated_at: string | null
          status: string
          updated_at: string
          user_id: string
          verifier: string
          wrapped_dek: string | null
        }
        Insert: {
          alias?: string
          created_at?: string
          fingerprint: string
          id?: string
          kdf_salt: string
          revoked_at?: string | null
          rotated_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
          verifier: string
          wrapped_dek?: string | null
        }
        Update: {
          alias?: string
          created_at?: string
          fingerprint?: string
          id?: string
          kdf_salt?: string
          revoked_at?: string | null
          rotated_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          verifier?: string
          wrapped_dek?: string | null
        }
        Relationships: []
      }
      tenant_key_events: {
        Row: {
          created_at: string
          detail: Json
          event: string
          id: string
          key_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          detail?: Json
          event: string
          id?: string
          key_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          detail?: Json
          event?: string
          id?: string
          key_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      upload_injection_audit: {
        Row: {
          content_sample: string | null
          created_at: string
          filename: string | null
          findings: Json
          id: number
          inferred_type: string | null
          rejected: boolean
          severity: string
          user_id: string | null
        }
        Insert: {
          content_sample?: string | null
          created_at?: string
          filename?: string | null
          findings?: Json
          id?: number
          inferred_type?: string | null
          rejected: boolean
          severity: string
          user_id?: string | null
        }
        Update: {
          content_sample?: string | null
          created_at?: string
          filename?: string | null
          findings?: Json
          id?: number
          inferred_type?: string | null
          rejected?: boolean
          severity?: string
          user_id?: string | null
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
      user_referral_codes: {
        Row: {
          code: string
          created_at: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
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
      findings_mttr: {
        Row: {
          fixed_findings: number | null
          mean_hours_to_patch: number | null
          median_hours_to_patch: number | null
        }
        Relationships: []
      }
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
      package_upload_jobs_safe: {
        Row: {
          attempts: number | null
          created_at: string | null
          error: string | null
          filename: string | null
          finished_at: string | null
          id: string | null
          inferred_type: string | null
          package_id: string | null
          result: Json | null
          slug: string | null
          started_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          error?: string | null
          filename?: string | null
          finished_at?: string | null
          id?: string | null
          inferred_type?: string | null
          package_id?: string | null
          result?: Json | null
          slug?: string | null
          started_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          error?: string | null
          filename?: string | null
          finished_at?: string | null
          id?: string | null
          inferred_type?: string | null
          package_id?: string | null
          result?: Json | null
          slug?: string | null
          started_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      package_versions_public: {
        Row: {
          compatibility: Json | null
          created_at: string | null
          examples: Json | null
          id: string | null
          notes: string | null
          package_id: string | null
          parent_version_id: string | null
          status: Database["public"]["Enums"]["version_status"] | null
          version: string | null
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
          {
            foreignKeyName: "package_versions_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "package_versions_public"
            referencedColumns: ["id"]
          },
        ]
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
      agent_onboarding_funnel: {
        Args: { _days?: number }
        Returns: {
          completions: number
          sessions: number
          stage: string
          step_id: string
        }[]
      }
      attach_execution_outcome: {
        Args: {
          _agent_fp?: string
          _execution_id: string
          _human_intervention?: boolean
          _task_completed?: boolean
          _user_rating?: number
        }
        Returns: boolean
      }
      award_referral_credits: {
        Args: { _credits: number; _kind: string; _referral_id: string }
        Returns: Json
      }
      check_rls_coverage: {
        Args: never
        Returns: {
          issue: string
          policy_count: number
          rls_enabled: boolean
          table_name: string
        }[]
      }
      claim_referral: {
        Args: { _code: string; _package_slug?: string; _source_url?: string }
        Returns: Json
      }
      compute_skill_drift: {
        Args: { _package_id: string; _window_days?: number }
        Returns: Json
      }
      crm_active_hours: {
        Args: { _user_id: string }
        Returns: {
          events: number
          hour: number
        }[]
      }
      crm_customers: {
        Args: { _limit?: number; _offset?: number }
        Returns: {
          agent_count: number
          cancel_at_period_end: boolean
          cloud_skill_count: number
          credits_spent: number
          crm_unsubscribed: boolean
          current_period_end: string
          diagnosis_count: number
          display_name: string
          email: string
          emails_sent_7d: number
          executions_30d: number
          handle: string
          install_count: number
          last_active_at: string
          last_email_at: string
          last_review_at: string
          last_sign_in_at: string
          mcp_call_count: number
          mcp_last_call_at: string
          mcp_last_used_at: string
          mcp_token_count: number
          package_count: number
          plan_slug: string
          price_cents: number
          residency_count: number
          review_count: number
          signed_up_at: string
          stage: string
          sub_environment: string
          sub_status: string
          upload_count: number
          user_id: string
        }[]
      }
      crm_effectiveness: {
        Args: { _days?: number }
        Returns: {
          clicked: number
          converted: number
          last_sent_at: string
          opened: number
          sent: number
          trigger: string
          unsubscribed: number
          variant: string
        }[]
      }
      crm_send_hour_stats: {
        Args: { _days?: number }
        Returns: {
          converted: number
          engaged: number
          send_hour: number
          sent: number
        }[]
      }
      crm_track_click: { Args: { _token: string }; Returns: string }
      crm_track_open: { Args: { _token: string }; Returns: undefined }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      gen_referral_code: { Args: never; Returns: string }
      get_attack_class_benchmark: {
        Args: { _days?: number }
        Returns: {
          attack_class: string
          pass_rate: number
          passed: number
          subject_arm: string
          total: number
          wilson_lb: number
        }[]
      }
      get_credit_balance: { Args: { _user_id: string }; Returns: number }
      get_my_referral_stats: { Args: never; Returns: Json }
      get_pack_with_items: { Args: { _slug: string }; Returns: Json }
      get_package_ratings: { Args: { _package_id: string }; Returns: Json }
      get_review_eligibility: { Args: { _package_id: string }; Returns: Json }
      get_skill_trust: { Args: { _slug: string }; Returns: Json }
      get_skill_uplift: {
        Args: { _days?: number; _slug: string }
        Returns: Json
      }
      get_workspace_roi: {
        Args: { _days?: number }
        Returns: {
          completed: number
          completion_rate: number
          executions: number
          guardrail_blocks: number
          intervention_rate: number
          interventions: number
          last_seen: string
          latency_saved_ms: number
          packages_used: number
          thumbs_down: number
          thumbs_up: number
          tokens_saved: number
          workspace_hash: string
        }[]
      }
      grant_signup_bonus: { Args: { _user_id: string }; Returns: undefined }
      has_active_paid_subscription: {
        Args: { _user_id: string }
        Returns: boolean
      }
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
      mcp_check_and_log_call: {
        Args: {
          _identity: string
          _is_write: boolean
          _tool_name: string
          _user_id: string
        }
        Returns: Json
      }
      mcp_funnel_summary:
        | {
            Args: { _days?: number }
            Returns: {
              count: number
              distinct_users: number
              event: string
            }[]
          }
        | {
            Args: { _days?: number; _exclude_bots?: boolean }
            Returns: {
              count: number
              distinct_users: number
              event: string
            }[]
          }
      mcp_funnel_traffic_breakdown: {
        Args: { _days?: number }
        Returns: {
          bot_count: number
          bot_distinct: number
          event: string
          human_count: number
          human_distinct: number
        }[]
      }
      mcp_funnel_ua_families: {
        Args: { _days?: number; _limit?: number }
        Returns: {
          count: number
          is_bot: boolean
          ua_family: string
        }[]
      }
      mcp_idempotency_get: {
        Args: { _key_hash: string; _tool: string; _user_id: string }
        Returns: Json
      }
      mcp_idempotency_put: {
        Args: {
          _key_hash: string
          _response: Json
          _tool: string
          _user_id: string
        }
        Returns: undefined
      }
      mcp_oauth_exchange_code: {
        Args: {
          _access_token_hash: string
          _access_ttl_seconds?: number
          _client_id: string
          _code_hash: string
          _redirect_uri: string
          _refresh_token_hash: string
          _refresh_ttl_seconds?: number
        }
        Returns: Json
      }
      mcp_oauth_get_client: { Args: { _client_id: string }; Returns: Json }
      mcp_oauth_issue_code: {
        Args: {
          _client_id: string
          _code_challenge: string
          _code_challenge_method: string
          _code_hash: string
          _redirect_uri: string
          _scope: string
          _ttl_seconds?: number
        }
        Returns: undefined
      }
      mcp_oauth_list_user_connections: {
        Args: never
        Returns: {
          active_access: number
          active_refresh: number
          client_id: string
          client_name: string
          first_granted: string
          last_used: string
          scope: string
        }[]
      }
      mcp_oauth_refresh_token: {
        Args: {
          _access_ttl_seconds?: number
          _client_id: string
          _new_access_hash: string
          _new_refresh_hash: string
          _old_refresh_hash: string
          _refresh_ttl_seconds?: number
        }
        Returns: Json
      }
      mcp_oauth_register_client: {
        Args: {
          _client_name: string
          _client_uri?: string
          _ip?: string
          _logo_uri?: string
          _redirect_uris: string[]
          _software_id?: string
          _software_version?: string
        }
        Returns: Json
      }
      mcp_oauth_revoke_client_for_user: {
        Args: { _client_id: string }
        Returns: number
      }
      mcp_oauth_revoke_token: {
        Args: { _token_hash: string }
        Returns: undefined
      }
      mcp_oauth_verify_access: { Args: { _token_hash: string }; Returns: Json }
      moderate_review: {
        Args: {
          _hide: boolean
          _reason?: string
          _resolution?: string
          _review_id: string
        }
        Returns: undefined
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      next_sas_code: { Args: never; Returns: string }
      purchase_pack: { Args: { _pack_id: string }; Returns: Json }
      purchase_package: { Args: { _package_id: string }; Returns: Json }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      recompute_trust_scores_v2: { Args: never; Returns: number }
      record_mcp_funnel_event: {
        Args: {
          _anon_hash?: string
          _client_id?: string
          _client_name?: string
          _event: string
          _props?: Json
        }
        Returns: undefined
      }
      report_review: {
        Args: { _details?: string; _reason: string; _review_id: string }
        Returns: string
      }
      report_skill_execution: {
        Args: {
          _agent_fp?: string
          _arm?: string
          _baseline_latency_ms?: number
          _baseline_tokens?: number
          _error_kind?: string
          _experiment_key?: string
          _human_intervention?: boolean
          _latency_ms?: number
          _model?: string
          _slug: string
          _success: boolean
          _task_completed?: boolean
          _tokens_in?: number
          _tokens_out?: number
          _user_rating?: number
          _version?: string
          _workspace_hash?: string
        }
        Returns: string
      }
      resolve_report: {
        Args: { _report_id: string; _resolution?: string; _status: string }
        Returns: undefined
      }
      search_packages: {
        Args: {
          limit_count?: number
          offset_count?: number
          package_type?: string
          query: string
        }
        Returns: {
          description: string
          install_count: number
          latest_version: string
          name: string
          rank: number
          slug: string
          type: string
        }[]
      }
      seed_robustness_findings_for: {
        Args: { _package_id: string }
        Returns: number
      }
      snapshot_package_weekly_metrics: { Args: never; Returns: number }
      submit_package_feedback: {
        Args: {
          _agent_model?: string
          _comments?: string
          _context?: Json
          _rating?: number
          _request_id: string
          _sentiment?: string
          _source?: string
        }
        Returns: string
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
      trust_saturate: { Args: { k: number; n: number }; Returns: number }
      wilson_lower_bound:
        | { Args: { successes: number; total: number }; Returns: number }
        | {
            Args: { successes: number; total: number; z?: number }
            Returns: number
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
