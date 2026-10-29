# Agent Pass entitlement fix

- [x] Separate Pro access from standalone Agent Pass across UI and server gates.
- [x] Preserve Pro upgrades, billing management, and grandfathered Pro access.
- [x] Run 14 targeted tests; verify signed-in billing and simulated Agent Pass upgrade routing.
- [ ] Complete checkout verification: blocked by missing `sak_pro_yearly` price in the Stripe test catalog; no product/catalog changes made.