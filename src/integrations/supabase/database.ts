import type { PlatformTables, PlatformFunctions } from "./platform-schema";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database as GeneratedDatabase } from "./types";
import type { OptionalTables, OptionalViews } from "./optional-schema";

// The generated types are regenerated from the live database and are the source
// of truth. Hand-written contracts (optional-schema, platform-schema) only add
// entries that do not exist there yet; generated entries always win, otherwise
// intersecting duplicate `Relationships` definitions breaks embedded-resource
// type parsing in supabase-js (e.g. "column 'packages' does not exist").
type MergeGenerated<T extends object, U extends object> = T & {
  [K in Exclude<keyof U, keyof T>]: U[K];
};

type MergedTables = MergeGenerated<GeneratedDatabase["public"]["Tables"], OptionalTables & PlatformTables>;
type MergedViews = MergeGenerated<GeneratedDatabase["public"]["Views"], OptionalViews>;
type MergedFunctions = MergeGenerated<GeneratedDatabase["public"]["Functions"], PlatformFunctions>;

export type Database = Omit<GeneratedDatabase, "public"> & {
  public: Omit<GeneratedDatabase["public"], "Tables" | "Views" | "Functions"> & {
    Tables: MergedTables;
    Views: MergedViews;
    Functions: MergedFunctions;
  };
};
export type AppDatabaseClient = SupabaseClient<Database>;
export type Row<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Insert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type Update<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
export type { Json } from "./types";
