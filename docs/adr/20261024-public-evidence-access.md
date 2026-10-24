# Public evidence through package APIs

Direct anonymous reads of `package_artifacts` and `skill_compatibility` became visible when the first 21 qualified business versions were published. The unchanged anonymous-access check rejected both tables.

Restrict their existing SELECT policies to `authenticated`, retaining their current row predicates and administrator/author permissions. Do not expand the public-read allowlist. Anonymous package metadata and downloads continue through the existing server/API paths: `loadPluginPackage` requires a published, approved, free package and binds its version/archive; marketplace trust reads require a published, approved package.

Validate the migration with the transactional business RLS suite, including denial of direct anonymous current/old archive and compatibility reads. Then rerun anonymous coverage checks and verify all 21 public package APIs still return the qualified version, prompt hash and exclusive supported model. No adversarial criteria, source archives, publication status or reviewer may change.
