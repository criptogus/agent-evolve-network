// Optional feature contracts from the committed migrations listed below.
// Types do not provision tables or change deployment permissions.
import type { Json } from "./types";
export type OptionalTables = {
  // 20260513040000_referral_lineage.sql
  package_lineage: {
    Row: {
      child_package_id: string;
      parent_package_id: string;
      fork_kind: "fork" | "adaptation" | "translation" | "derivative";
      rev_share_bps: number;
      attributed_at: string;
      attributed_by: string;
    };
    Insert: {
      child_package_id: string;
      parent_package_id: string;
      fork_kind: "fork" | "adaptation" | "translation" | "derivative";
      rev_share_bps?: number;
      attributed_at?: string;
      attributed_by: string;
    };
    Update: {
      child_package_id?: string;
      parent_package_id?: string;
      fork_kind?: "fork" | "adaptation" | "translation" | "derivative";
      rev_share_bps?: number;
      attributed_at?: string;
      attributed_by?: string;
    };
    Relationships: [
      {
        foreignKeyName: "package_lineage_child_package_id_fkey";
        columns: ["child_package_id"];
        isOneToOne: true;
        referencedRelation: "packages";
        referencedColumns: ["id"];
      },
      {
        foreignKeyName: "package_lineage_parent_package_id_fkey";
        columns: ["parent_package_id"];
        isOneToOne: false;
        referencedRelation: "packages";
        referencedColumns: ["id"];
      },
    ];
  };
  // 20260513040000_referral_lineage.sql
  revenue_share_payouts: {
    Row: {
      id: number;
      source_payment_id: string;
      package_id: string | null;
      payee_user_id: string;
      payer_user_id: string | null;
      kind: "referral" | "lineage" | "platform" | "author";
      amount_cents: number;
      currency: string;
      notes: string | null;
      created_at: string;
    };
    Insert: {
      id?: number;
      source_payment_id: string;
      package_id?: string | null;
      payee_user_id: string;
      payer_user_id?: string | null;
      kind: "referral" | "lineage" | "platform" | "author";
      amount_cents: number;
      currency?: string;
      notes?: string | null;
      created_at?: string;
    };
    Update: {
      id?: number;
      source_payment_id?: string;
      package_id?: string | null;
      payee_user_id?: string;
      payer_user_id?: string | null;
      kind?: "referral" | "lineage" | "platform" | "author";
      amount_cents?: number;
      currency?: string;
      notes?: string | null;
      created_at?: string;
    };
    Relationships: [
      {
        foreignKeyName: "revenue_share_payouts_package_id_fkey";
        columns: ["package_id"];
        isOneToOne: false;
        referencedRelation: "packages";
        referencedColumns: ["id"];
      },
    ];
  };
  // 20260513050000_bounties_leaderboard.sql
  skill_bounties: {
    Row: {
      id: string;
      posted_by: string;
      title: string;
      brief: string;
      vertical: "security" | "fintech" | "healthcare" | "devops" | "general";
      required_trust_score: number;
      required_adversarial_pass: number;
      reward_cents: number;
      currency: string;
      deadline: string | null;
      status: "open" | "claimed" | "paid" | "cancelled" | "expired";
      winning_package_id: string | null;
      winner_user_id: string | null;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      posted_by: string;
      title: string;
      brief: string;
      vertical: "security" | "fintech" | "healthcare" | "devops" | "general";
      required_trust_score?: number;
      required_adversarial_pass?: number;
      reward_cents: number;
      currency?: string;
      deadline?: string | null;
      status?: "open" | "claimed" | "paid" | "cancelled" | "expired";
      winning_package_id?: string | null;
      winner_user_id?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      posted_by?: string;
      title?: string;
      brief?: string;
      vertical?: "security" | "fintech" | "healthcare" | "devops" | "general";
      required_trust_score?: number;
      required_adversarial_pass?: number;
      reward_cents?: number;
      currency?: string;
      deadline?: string | null;
      status?: "open" | "claimed" | "paid" | "cancelled" | "expired";
      winning_package_id?: string | null;
      winner_user_id?: string | null;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [
      {
        foreignKeyName: "skill_bounties_winning_package_id_fkey";
        columns: ["winning_package_id"];
        isOneToOne: false;
        referencedRelation: "packages";
        referencedColumns: ["id"];
      },
    ];
  };
  // 20260513050000_bounties_leaderboard.sql
  bounty_submissions: {
    Row: {
      id: string;
      bounty_id: string;
      submitted_by: string;
      package_id: string;
      trust_score_at_submission: number | null;
      adversarial_score_at_submission: number | null;
      status: "pending" | "accepted" | "rejected" | "withdrawn";
      submitted_at: string;
    };
    Insert: {
      id?: string;
      bounty_id: string;
      submitted_by: string;
      package_id: string;
      trust_score_at_submission?: number | null;
      adversarial_score_at_submission?: number | null;
      status?: "pending" | "accepted" | "rejected" | "withdrawn";
      submitted_at?: string;
    };
    Update: {
      id?: string;
      bounty_id?: string;
      submitted_by?: string;
      package_id?: string;
      trust_score_at_submission?: number | null;
      adversarial_score_at_submission?: number | null;
      status?: "pending" | "accepted" | "rejected" | "withdrawn";
      submitted_at?: string;
    };
    Relationships: [
      {
        foreignKeyName: "bounty_submissions_bounty_id_fkey";
        columns: ["bounty_id"];
        isOneToOne: false;
        referencedRelation: "skill_bounties";
        referencedColumns: ["id"];
      },
      {
        foreignKeyName: "bounty_submissions_package_id_fkey";
        columns: ["package_id"];
        isOneToOne: false;
        referencedRelation: "packages";
        referencedColumns: ["id"];
      },
    ];
  };
  // 20260513070000_skill_of_the_week.sql
  skill_of_the_week: {
    Row: {
      id: string;
      week_starting: string;
      package_id: string;
      rank: number;
      score: number;
      trust_score: number | null;
      adversarial_pass_rate: number | null;
      installs_7d: number | null;
      novelty_bonus: number;
      announced_at: string;
    };
    Insert: {
      id?: string;
      week_starting: string;
      package_id: string;
      rank?: number;
      score: number;
      trust_score?: number | null;
      adversarial_pass_rate?: number | null;
      installs_7d?: number | null;
      novelty_bonus?: number;
      announced_at?: string;
    };
    Update: {
      id?: string;
      week_starting?: string;
      package_id?: string;
      rank?: number;
      score?: number;
      trust_score?: number | null;
      adversarial_pass_rate?: number | null;
      installs_7d?: number | null;
      novelty_bonus?: number;
      announced_at?: string;
    };
    Relationships: [
      {
        foreignKeyName: "skill_of_the_week_package_id_fkey";
        columns: ["package_id"];
        isOneToOne: false;
        referencedRelation: "packages";
        referencedColumns: ["id"];
      },
    ];
  };
  // 20260513080000_collections.sql
  skill_collections: {
    Row: {
      id: string;
      slug: string;
      curator_user_id: string;
      title: string;
      description: string | null;
      is_public: boolean;
      cover_emoji: string | null;
      curator_share_bps: number;
      created_at: string;
      updated_at: string;
    };
    Insert: {
      id?: string;
      slug: string;
      curator_user_id: string;
      title: string;
      description?: string | null;
      is_public?: boolean;
      cover_emoji?: string | null;
      curator_share_bps?: number;
      created_at?: string;
      updated_at?: string;
    };
    Update: {
      id?: string;
      slug?: string;
      curator_user_id?: string;
      title?: string;
      description?: string | null;
      is_public?: boolean;
      cover_emoji?: string | null;
      curator_share_bps?: number;
      created_at?: string;
      updated_at?: string;
    };
    Relationships: [];
  };
  // 20260513080000_collections.sql
  skill_collection_items: {
    Row: {
      collection_id: string;
      package_id: string;
      position: number;
      note: string | null;
      added_at: string;
    };
    Insert: {
      collection_id: string;
      package_id: string;
      position?: number;
      note?: string | null;
      added_at?: string;
    };
    Update: {
      collection_id?: string;
      package_id?: string;
      position?: number;
      note?: string | null;
      added_at?: string;
    };
    Relationships: [
      {
        foreignKeyName: "skill_collection_items_collection_id_fkey";
        columns: ["collection_id"];
        isOneToOne: false;
        referencedRelation: "skill_collections";
        referencedColumns: ["id"];
      },
      {
        foreignKeyName: "skill_collection_items_package_id_fkey";
        columns: ["package_id"];
        isOneToOne: false;
        referencedRelation: "packages";
        referencedColumns: ["id"];
      },
    ];
  };
  // 20260513080000_collections.sql
  skill_collection_followers: {
    Row: {
      collection_id: string;
      user_id: string;
      followed_at: string;
    };
    Insert: {
      collection_id: string;
      user_id: string;
      followed_at?: string;
    };
    Update: {
      collection_id?: string;
      user_id?: string;
      followed_at?: string;
    };
    Relationships: [
      {
        foreignKeyName: "skill_collection_followers_collection_id_fkey";
        columns: ["collection_id"];
        isOneToOne: false;
        referencedRelation: "skill_collections";
        referencedColumns: ["id"];
      },
    ];
  };
  // 20260513090000_author_tips.sql
  author_tip_intents: {
    Row: {
      id: string;
      package_id: string | null;
      payer_user_id: string | null;
      recipient_user_id: string;
      amount_cents: number;
      currency: string;
      message: string | null;
      source: string | null;
      payment_provider: string;
      provider_intent_id: string | null;
      status: "created" | "succeeded" | "failed" | "refunded";
      created_at: string;
      confirmed_at: string | null;
    };
    Insert: {
      id?: string;
      package_id?: string | null;
      payer_user_id?: string | null;
      recipient_user_id: string;
      amount_cents: number;
      currency?: string;
      message?: string | null;
      source?: string | null;
      payment_provider: string;
      provider_intent_id?: string | null;
      status?: "created" | "succeeded" | "failed" | "refunded";
      created_at?: string;
      confirmed_at?: string | null;
    };
    Update: {
      id?: string;
      package_id?: string | null;
      payer_user_id?: string | null;
      recipient_user_id?: string;
      amount_cents?: number;
      currency?: string;
      message?: string | null;
      source?: string | null;
      payment_provider?: string;
      provider_intent_id?: string | null;
      status?: "created" | "succeeded" | "failed" | "refunded";
      created_at?: string;
      confirmed_at?: string | null;
    };
    Relationships: [
      {
        foreignKeyName: "author_tip_intents_package_id_fkey";
        columns: ["package_id"];
        isOneToOne: false;
        referencedRelation: "packages";
        referencedColumns: ["id"];
      },
    ];
  };
  // 20260513100000_shared_runs.sql
  shared_runs: {
    Row: {
      id: string;
      share_token: string;
      package_id: string;
      package_slug: string;
      package_version: string | null;
      prompt: string;
      output: string;
      model: string | null;
      duration_ms: number | null;
      redacted: boolean;
      view_count: number;
      created_by: string | null;
      created_at: string;
    };
    Insert: {
      id?: string;
      share_token: string;
      package_id: string;
      package_slug: string;
      package_version?: string | null;
      prompt: string;
      output: string;
      model?: string | null;
      duration_ms?: number | null;
      redacted?: boolean;
      view_count?: number;
      created_by?: string | null;
      created_at?: string;
    };
    Update: {
      id?: string;
      share_token?: string;
      package_id?: string;
      package_slug?: string;
      package_version?: string | null;
      prompt?: string;
      output?: string;
      model?: string | null;
      duration_ms?: number | null;
      redacted?: boolean;
      view_count?: number;
      created_by?: string | null;
      created_at?: string;
    };
    Relationships: [
      {
        foreignKeyName: "shared_runs_package_id_fkey";
        columns: ["package_id"];
        isOneToOne: false;
        referencedRelation: "packages";
        referencedColumns: ["id"];
      },
    ];
  };
};
export type OptionalViews = {
  affiliate_leaderboard_30d: {
    Row: { referrer_id: string; activated_referrals: number; referral_earnings_cents: number };
    Relationships: [];
  };
};
