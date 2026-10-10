# Semantic frontend guards — MAIR-437

The remaining import/forwarding/credentials policies inspect TypeScript syntax nodes instead of quote or whitespace patterns. Existing route, method, same-origin, BFF ownership and contract limits remain enforced. These are structural policies; published-contract HTTP tests remain the user-behavior evidence.

Only test helpers, assertions and documentation change. Application code, dependency manifests/locks, BFF/API contracts, security controls, coverage thresholds and RGAA configuration are unchanged. Isolated input comparisons and real-source suites are recorded separately from main, local-current and Dev image delivery. Deployed authentication, BFF permissions/persistence and rollout remain unverified without a usable Dev account.

Network inventories also read quoted HTTP method property names by AST value; source formatting does not turn POST/PATCH into GET. Environment receivers are parsed by AST in Login and Settings. These remain structural policies; existing HTTP contract tests provide separate execution evidence.

Qualified fetch calls are identified from AST receiver nodes, so whitespace around window/global property access does not hide a call.
