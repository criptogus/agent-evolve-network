import type { PlatformTables, PlatformFunctions } from "./platform-schema";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database as GeneratedDatabase } from "./types";
import type { OptionalTables, OptionalViews } from "./optional-schema";
export type Database = Omit<GeneratedDatabase, "public"> & {
  public: Omit<GeneratedDatabase["public"], "Tables" | "Views" | "Functions"> & {
    Tables: GeneratedDatabase["public"]["Tables"] & OptionalTables & PlatformTables;
    Functions: GeneratedDatabase["public"]["Functions"] & PlatformFunctions;
    Views: GeneratedDatabase["public"]["Views"] & OptionalViews;
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
