---
layout: post
title: "Authorization Infrastructure Compared"
post_title: "InferaDB vs. OpenFGA vs. SpiceDB vs. Oso: Authorization Infrastructure Compared"
date: 2026-03-28
last_modified_at: 2026-03-28
category: engineering
description: "A fair comparison of InferaDB, OpenFGA, SpiceDB, and Oso covering performance, security, pricing, and operational burden."
hero: /assets/images/dispatch/authorization-compared.svg
authors:
  - Evan Sims
---

**Most authorization comparisons are thinly disguised sales pages.** They cherry-pick benchmarks, ignore trade-offs, and assume you've already decided to buy whatever they're selling.

This isn't that. We helped build OpenFGA at Okta, shipped Auth0's authorization platform, and watched thousands of teams make this decision. We know what matters and what doesn't, and we know where every option — including ours — has real limitations.

Choosing authorization infrastructure is a high-stakes, high-lock-in decision. You're picking the system that sits in the critical path of every API call, every page load, every agent action. Get it wrong and you're either rebuilding in 18 months or living with compromises that compound into security incidents.

Here's the landscape as it actually stands.

## The Options

There are four real paths: OpenFGA, SpiceDB (AuthZed), Oso, or building it yourself. Each makes fundamentally different trade-offs. InferaDB represents a fifth option — one we believe addresses the gaps in the others — but we'll get to that after an honest look at the field.

## OpenFGA

OpenFGA is an open-source, Zanzibar-inspired authorization system originally built at Auth0 (where several of our team members were core contributors). It models permissions as relationships between objects and users, evaluated through a type system defined in a DSL.

**Strengths:**

- Fully open source under Apache 2.0 with an active community
- Mature relationship-based access control model with a well-designed DSL
- Strong ecosystem of SDKs across major languages
- Backed by the CNCF, which provides long-term governance stability
- Battle-tested at scale inside Okta's production infrastructure

**Weaknesses:**

- No first-party managed service — Auth0 FGA (built on OpenFGA) exists but is a separate product under Okta's umbrella. Self-hosting OpenFGA means you own deployment, scaling, and operations.
- Delegates storage to PostgreSQL or MySQL, inheriting their latency floor (typically 5-20ms per check)
- Multi-tenancy is application-level, enforced by store IDs rather than cryptographic isolation
- Consistency guarantees depend on your database configuration, not the authorization layer
- Caching is necessary for acceptable latency, which reintroduces the stale permission problem

**Best for:** Teams with strong infrastructure engineering who want full control over their authorization stack and are comfortable operating a distributed system. If you have a dedicated platform team and prefer open-source governance over vendor dependency, OpenFGA is a serious option.

## SpiceDB / AuthZed

SpiceDB is the other major open-source Zanzibar implementation, built by the AuthZed team. It's available as both an open-source database and a managed service (AuthZed Dedicated). AuthZed has raised significant venture funding and has one of the most active authorization-focused open source communities.

**Strengths:**

- Open-source core (SpiceDB) with a genuine managed option (AuthZed)
- Purpose-built storage layer with support for multiple backends (PostgreSQL, CockroachDB, Spanner)
- Strong consistency model with zed tokens for snapshot reads
- Excellent developer tooling — `zed` CLI, Playground, schema validation
- Active community and responsive maintainers
- Transparent about architecture and design decisions

**Weaknesses:**

- Managed offering uses resource-based pricing, which can scale unpredictably under bursty authorization workloads
- Still relies on general-purpose databases for storage — CockroachDB or Spanner improve consistency but don't eliminate the latency overhead
- Multi-tenancy in the managed offering is logically isolated, not cryptographically isolated
- No built-in tamper-evident audit trail at the storage level
- Schema language (zed) is powerful but has a learning curve distinct from standard policy languages

**Best for:** Teams that want Zanzibar semantics with a managed option and strong open-source escape hatch. If you're already running CockroachDB or Spanner and want authorization that integrates with your existing consistency model, SpiceDB is the most natural fit.

## Oso

Oso takes a different architectural approach. Rather than a Zanzibar-style relationship store, Oso provides a policy engine built around Polar, a declarative logic programming language. Their managed cloud offering focuses on developer experience and has recently leaned into authorization for AI agent workflows.

**Strengths:**

- Polar is genuinely expressive — it can represent complex authorization logic that pure relationship models struggle with
- Strong developer experience with clear documentation and local development tooling
- MAU-based pricing is predictable and easy to budget for
- Good fit for applications where authorization logic is complex and context-dependent
- Growing focus on AI agent authorization, which is an increasingly important use case

**Weaknesses:**

- The open-source Oso library (including Polar) was Apache 2.0 licensed but is now deprecated. Oso Cloud is a proprietary service — your authorization logic is coupled to their managed runtime.
- MAU-based pricing becomes expensive at scale for B2C applications with large user bases
- Less community adoption than OpenFGA or SpiceDB, which means fewer community resources
- Authorization evaluation happens in the policy engine, not at the storage level — complex policies can introduce latency
- Different architectural paradigm means migration to or from Oso requires rethinking your authorization model, not just porting data

**Best for:** Teams building applications with complex, context-dependent authorization logic — especially in B2B SaaS where MAU-based pricing aligns with the business model. If your authorization rules don't fit cleanly into a relationship graph, Oso's policy-first approach may be more natural.

## Building In-House

The most common "choice" is no choice at all: teams embed authorization logic directly in application code. `if user.role == "admin"` sprinkled across hundreds of endpoints. It works until it doesn't.

**Strengths:**

- No vendor dependency or new infrastructure to operate
- Full control over every implementation detail
- No learning curve for a new DSL or policy language

**Weaknesses:**

- The real cost is consistently underestimated. Teams typically spend 6-12 months building a basic authorization system, then dedicate 2-4 engineers to maintaining it indefinitely. At fully loaded costs ($200-250K per engineer), that's $400K-1M/year — far more than any managed service.
- Authorization logic scattered across application code is nearly impossible to audit
- No consistency guarantees unless you build them yourself
- Every new service, every new API, every new microservice needs its own permission checks — and they all need to agree
- Compliance frameworks (SOC 2, HIPAA, NIS2, DORA) increasingly require centralized, auditable access control. In-house systems rarely meet this bar without significant additional investment.

**Best for:** Very early-stage startups with simple RBAC needs and fewer than 10 endpoints. For everyone else, the total cost of ownership makes this the most expensive option by a wide margin.

## Comparison Table

<div class="compare-wrap">
<table class="compare-matrix">
<thead>
<tr>
<th class="compare-dimension-head">Dimension</th>
<th>OpenFGA</th>
<th>SpiceDB / AuthZed</th>
<th>Oso</th>
<th>In-House</th>
<th class="compare-col-infera">InferaDB</th>
</tr>
</thead>
<tbody>
<tr>
<td class="compare-dimension">License</td>
<td class="compare-neutral">Apache 2.0</td>
<td class="compare-neutral">Apache 2.0 (SpiceDB)</td>
<td class="compare-neutral">Apache 2.0 (library, deprecated); Cloud is proprietary</td>
<td class="compare-weak">N/A</td>
<td class="compare-win">MIT + Apache 2.0</td>
</tr>
<tr>
<td class="compare-dimension">Managed Service</td>
<td class="compare-neutral">Auth0 FGA (built on OpenFGA)</td>
<td class="compare-neutral">Yes (AuthZed)</td>
<td class="compare-neutral">Yes (Oso Cloud)</td>
<td class="compare-weak">N/A</td>
<td class="compare-win">Yes (InferaDB Cloud)</td>
</tr>
<tr>
<td class="compare-dimension">Auth Model</td>
<td class="compare-neutral">ReBAC (Zanzibar)</td>
<td class="compare-neutral">ReBAC (Zanzibar)</td>
<td class="compare-neutral">Policy engine (Polar)</td>
<td class="compare-weak">Ad hoc</td>
<td class="compare-win">ReBAC + ABAC + RBAC (IPL)</td>
</tr>
<tr>
<td class="compare-dimension">Storage</td>
<td class="compare-weak">PostgreSQL / MySQL</td>
<td class="compare-neutral">PostgreSQL / CockroachDB / Spanner</td>
<td class="compare-neutral">Proprietary</td>
<td class="compare-weak">Your database</td>
<td class="compare-win">Purpose-built engine</td>
</tr>
<tr>
<td class="compare-dimension">Read Latency (p99)</td>
<td class="compare-weak">5-20ms</td>
<td class="compare-neutral">5-15ms</td>
<td class="compare-weak">10-50ms</td>
<td class="compare-neutral">Varies</td>
<td class="compare-win">~3 &micro;s</td>
</tr>
<tr>
<td class="compare-dimension">Consistency</td>
<td class="compare-weak">Tunable (DB-dependent)</td>
<td class="compare-neutral">Snapshot (zed tokens)</td>
<td class="compare-weak">Eventual</td>
<td class="compare-neutral">Varies</td>
<td class="compare-win">Linearizable (Raft)</td>
</tr>
<tr>
<td class="compare-dimension">Multi-Tenancy</td>
<td class="compare-weak">Application-level (store IDs)</td>
<td class="compare-neutral">Logical isolation</td>
<td class="compare-neutral">Logical isolation</td>
<td class="compare-weak">Application-level</td>
<td class="compare-win">Cryptographic (per-vault)</td>
</tr>
<tr>
<td class="compare-dimension">Audit Trail</td>
<td class="compare-weak">Application-level logging</td>
<td class="compare-neutral">Audit logging</td>
<td class="compare-neutral">Built-in logs</td>
<td class="compare-weak">Manual</td>
<td class="compare-win">Merkle proof (tamper-evident)</td>
</tr>
<tr>
<td class="compare-dimension">Pricing</td>
<td class="compare-neutral">Free (self-hosted) / Auth0 FGA</td>
<td class="compare-neutral">Resource-based (managed)</td>
<td class="compare-neutral">MAU-based</td>
<td class="compare-weak">Engineering time</td>
<td class="compare-win">Usage-based, from $0</td>
</tr>
<tr>
<td class="compare-dimension">Extensibility</td>
<td class="compare-weak">Limited</td>
<td class="compare-neutral">Caveats / Assertions</td>
<td class="compare-neutral">Polar language</td>
<td class="compare-neutral">Unlimited</td>
<td class="compare-win">WASM modules</td>
</tr>
</tbody>
</table>
</div>

<p class="perf-note">Latency figures are core engine benchmarks where available. Production latency varies by deployment topology.</p>

## Where InferaDB Fits

InferaDB is purpose-built managed authorization infrastructure — not a policy engine that delegates to a general-purpose database, and not a framework you deploy and operate yourself.

The architectural distinction matters. By controlling the storage engine, consensus protocol, and query evaluation in a single system, InferaDB eliminates the latency floor that every other option inherits from its storage backend.

**What InferaDB does differently:**

- **2.8 microsecond p99 reads** from a custom B+ tree storage engine — not through caching, but through purpose-built data structures optimized for the permission evaluation workload
- **Cryptographic tenant isolation** via per-vault AES-256-GCM envelope encryption — cross-tenant access isn't prevented by application logic, it's architecturally impossible
- **Merkle proof audit trails** that are tamper-evident at the storage level — not application-level logs that can be modified or deleted
- **Linearizable consistency** via Raft consensus with revision tokens — when a permission is revoked, no replica can serve a stale grant
- **The Infera Policy Language (IPL)** unifies RBAC, ReBAC, and ABAC in a single schema — statically analyzed at deploy time, evaluated in parallel at query time
- **WASM extensibility** for custom logic (IP ranges, subscription tiers, time windows) without sacrificing the security guarantees of the core system

**What InferaDB doesn't do (yet):**

We're honest about where we are. InferaDB is newer than OpenFGA and SpiceDB. Our community is smaller. Our SDK coverage is growing but not yet at parity with the most established options. If you need a solution that's been in production at thousands of companies for years, the incumbents have that track record and we don't — yet.

## Making the Decision

There's no universally correct choice. The right authorization infrastructure depends on your constraints:

- **If you need full control and have a platform team**: OpenFGA gives you open-source Zanzibar semantics with no vendor lock-in, at the cost of operational burden.
- **If you want Zanzibar with a managed option**: AuthZed/SpiceDB offers the strongest combination of open-source core and managed service in the Zanzibar ecosystem.
- **If your authorization logic is complex and context-dependent**: Oso's policy-first approach with Polar may express your rules more naturally than a relationship graph.
- **If performance, security, and operational simplicity are your primary constraints**: InferaDB eliminates the general-purpose database bottleneck and provides cryptographic guarantees that no other option offers.

The one option we'd actively discourage is building in-house, unless your authorization needs are genuinely trivial. The total cost of ownership is higher than any managed service, and the security risk of getting it wrong is existential.

## Try InferaDB

If sub-microsecond latency, cryptographic tenant isolation, and tamper-evident audit trails matter to your application, we'd like to show you what purpose-built authorization infrastructure looks like.

- **Get early access**: [Join the InferaDB Cloud waitlist](/waitlist)
- **Read the docs**: [Quickstart Guide](/docs/quickstart)
- **Explore the source**: [InferaDB on GitHub](https://github.com/inferadb/inferadb)
