// Types only — no mock runtime data. All package data is loaded from the database
// via server functions in src/lib/marketplace/*.functions.ts.

export type PackageType = "skill" | "playbook" | "soul" | "guardrail";

export interface PackageVersion {
  version: string;
  date: string;
  notes: string;
  status: "stable" | "beta" | "deprecated";
}

export interface CompatibilityCheck {
  runtime: string;
  status: "supported" | "partial" | "unsupported";
  detail: string;
}

export interface Package {
  id: string;
  name: string;
  type: PackageType;
  author: string;
  authorVerified?: boolean;
  downloads: string;
  rating: number;
  reviews: number;
  description: string;
  longDescription: string;
  latest: string;
  versions: PackageVersion[];
  compatibility: CompatibilityCheck[];
  dependencies: { name: string; version: string }[];
  scopes: string[];
  size: string;
  license: string;
  examples: { title: string; body: string }[];
  metrics: { label: string; value: string; delta?: string }[];
}
