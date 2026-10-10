# Semantic frontend guards — MAIR-437

The remaining import/forwarding/credentials policies inspect TypeScript syntax nodes instead of quote or whitespace patterns. Existing route, method, same-origin, BFF ownership and contract limits remain enforced. These are structural policies; published-contract HTTP tests remain the user-behavior evidence.

Only test helpers, assertions and documentation change. Application code, dependency manifests/locks, BFF/API contracts, security controls, coverage thresholds and RGAA configuration are unchanged. Isolated input comparisons and real-source suites are recorded separately from main, local-current and Dev image delivery. Deployed authentication, BFF permissions/persistence and rollout remain unverified without a usable Dev account.
