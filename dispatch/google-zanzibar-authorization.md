---
layout: post
title: "Google Zanzibar Authorization Model"
post_title: "Google Zanzibar: The Authorization Model Behind Every Google Product"
date: 2026-03-24
category: engineering
description: "Google built Zanzibar to check permissions 10M times per second across Gmail, Drive, and Cloud. How it works and why InferaDB goes further."
hero: /assets/images/dispatch/zanzibar.svg
authors:
  - Evan Sims
---

**Every time you share a Google Doc, upload to YouTube, or grant access to a GCP project, the same system decides whether it's allowed.** That system is Zanzibar — Google's globally distributed authorization service, handling over 10 million permission checks per second across more than 2 trillion stored relation tuples for billions of users.

Google published the [Zanzibar paper](https://research.google/pubs/zanzibar-googles-consistent-global-authorization-system/) in 2019. It described an architecture so far ahead of conventional authorization that every serious authorization system built since — including InferaDB — traces its lineage back to that paper.

This post explains what Zanzibar got right, why it matters for your architecture, and where the next generation needs to go.

## The Problem Zanzibar Solved

Before Zanzibar, Google's authorization was fragmented. Each product — Gmail, Drive, Cloud IAM, YouTube — had its own permission system with its own storage, its own consistency model, and its own bugs.

The consequences were predictable:

- **Duplicated logic** across dozens of services, each with its own edge cases
- **Inconsistent enforcement** — a permission revoked in one service might still be honored by another
- **No unified audit trail** — answering "who can access what" required querying every service independently
- **Role explosion** — RBAC models that started simple collapsed under the weight of thousands of roles with overlapping, conflicting grants

Google needed a single system that could answer "can this user do this action on this resource" for every product, at global scale, with strong consistency guarantees. That system became Zanzibar.

## How Zanzibar Works

Zanzibar's core insight is deceptively simple: **model all permissions as relationships, not roles.**

### Relation Tuples

The fundamental data structure is the **relation tuple** — a triple that expresses a relationship between a user and an object:

```
document:readme#owner@alice
folder:engineering#viewer@team:backend#member
```

The first tuple says "Alice is the owner of the document named readme." The second says "members of the backend team are viewers of the engineering folder." That's it. No role tables. No permission matrices. Just relationships.

This representation is powerful because it composes naturally. A folder's viewers include anyone who is a viewer of the folder directly, plus anyone who is a viewer of any parent folder, plus anyone who is a member of any group that has viewer access. These aren't special cases — they're the same tuple format, resolved through graph traversal.

### Namespace Configuration

Namespaces define how relationships should be interpreted. They specify **userset rewrite rules** — set operations (union, intersection, exclusion) that compute permissions from stored relationships without duplicating data.

For example, a document's `can_view` permission might be defined as: owner **union** editor **union** viewer **union** (viewer of parent folder). When you share a folder, every document inside it becomes accessible — not because you wrote tuples for each document, but because the namespace configuration expresses that inheritance declaratively.

### The New Enemy Problem

This is where Zanzibar distinguished itself from every authorization system that came before.

Consider this sequence:

1. Alice **removes** Bob from a document's access list
2. Alice **adds** sensitive content to the document
3. Bob's request arrives at a replica that hasn't yet received the removal from step 1

With eventual consistency, Bob sees the sensitive content. The permission was revoked, but a stale replica served the old grant. Alice created an enemy and then added secrets — and the system betrayed her.

Google named this the **"new enemy problem"** and solved it with **consistency tokens** (called "zookies" internally). Every write returns an opaque token encoding a timestamp. Subsequent reads that include this token are guaranteed to reflect at least that point in time. The system will never serve a stale grant for a permission that was revoked before the token was issued.

This is not a performance optimization. It is a **security property**.

## Why Zanzibar Won

The numbers from Google's 2019 paper speak for themselves:

- **10+ million authorization checks per second**
- **3ms median latency**, 95th percentile under 10ms
- **99.999% availability** — five nines
- **2+ trillion stored relationship tuples**

But the real victory was conceptual, not operational. Zanzibar proved that **relationship-based access control (ReBAC)** is fundamentally superior to role-based access control for complex, evolving organizations.

### RBAC Breaks Down

RBAC works when your organization is small and your permission model is static. It stops working the moment either of those conditions changes.

An enterprise with 10,000 employees, 50 products, and 200 resource types needs roles for every meaningful combination of user group, product, and access level. That's thousands of roles. When those roles overlap — and they always do — you get **role explosion**: a combinatorial proliferation of roles that no human can audit, no policy can govern, and no system can efficiently evaluate.

Worse, RBAC encodes **what** a user can do, but not **why**. When you see `role: project-admin`, you know the permissions, but you don't know the organizational relationship that justified them. When that relationship changes — someone transfers teams, a contractor's engagement ends — the role persists. This is **privilege creep**, and it's the root cause of most access control failures.

### ReBAC Models Reality

Zanzibar's relationship model mirrors how organizations actually work. You don't grant "viewer role on document X." You say "Alice is a member of the engineering team, and the engineering team has access to the engineering folder, and this document is in the engineering folder."

When Alice leaves the engineering team, one relationship change — removing her team membership — cascades through the entire permission graph. Every document, every folder, every resource that derived access from that membership is updated automatically. No role cleanup. No forgotten grants. No privilege creep.

This is not a theoretical advantage. It is the difference between authorization that works at organizational scale and authorization that slowly, quietly fails.

## The Open-Source Lineage

Zanzibar's publication sparked a generation of open-source implementations:

- **SpiceDB** (AuthZed) — the most faithful open-source Zanzibar implementation
- **OpenFGA** (originally Auth0/Okta) — Zanzibar-inspired with a flexible modeling language
- **Ory Keto** — early Zanzibar-inspired effort in the Ory ecosystem

These projects proved that Zanzibar's model works outside Google. Thousands of companies adopted them. They are legitimate, useful tools.

**But they all share the same architectural limitation.**

## The General-Purpose Database Ceiling

Google built Zanzibar on top of [Spanner](https://research.google/pubs/spanner-googles-globally-distributed-database/) — a purpose-built globally distributed database with TrueTime clocks, external consistency, and hardware-level timestamp guarantees. Spanner is the reason Zanzibar can serve consistent reads at global scale with single-digit millisecond latency.

Open-source Zanzibar implementations don't have Spanner. They delegate storage to general-purpose relational databases — MySQL, PostgreSQL, CockroachDB — that were designed for transactional workloads, not permission evaluation.

This is not a minor implementation detail. It is a **hard ceiling** on what these systems can achieve:

**Latency.** A simple "can user X access resource Y" check requires a graph traversal — following relationship chains through multiple tuples. In a general-purpose database, each hop is a query with parsing, planning, and transaction overhead. The result: **5-50ms per check**, depending on graph depth and cache state. Google's 3ms median was achieved with Spanner, not off-the-shelf databases.

**Consistency.** Most relational databases default to asynchronous replication. To get the consistency guarantees that make Zanzibar's new-enemy-problem solution work, you need synchronous replication — which dramatically increases write latency and reduces availability. Most deployments compromise, accepting eventual consistency and the stale-grant risk that comes with it.

**Multi-tenancy.** Application-level tenant isolation means a bug in the query layer can leak one tenant's permission data to another. There is no storage-level enforcement. The isolation guarantee is only as strong as the application code — and application code has bugs.

**Operational complexity.** Running a general-purpose database at scale requires connection pooling, vacuum tuning, index maintenance, replication lag monitoring, and backup orchestration. None of this is authorization-specific work. It is generic database operations that consume engineering time without improving authorization outcomes.

These are not problems that can be optimized away. They are consequences of building an authorization-specific workload on general-purpose storage.

## InferaDB: Zanzibar Without the Ceiling

We helped build OpenFGA. We saw the database ceiling from the inside. InferaDB is what we would have built if we'd had the freedom to design the entire stack — storage engine, consensus protocol, tenant isolation, and query evaluation — for the authorization workload from first principles.

### Purpose-Built Storage

InferaDB's custom **B+ tree storage engine**, written in Rust, is optimized for the authorization access pattern: small key-value lookups across relationship tuples, with read-heavy workloads and graph traversal.

- **2.8µs p99 read latency** — not milliseconds, microseconds
- **952,000+ operations per second** per node
- **Per-page envelope encryption** with AES-256-GCM

This is not an incremental improvement over a general-purpose database. It is three orders of magnitude faster on the operation that matters most: resolving a permission check.

### Consistency Without Compromise

Where Google used Spanner, InferaDB uses **Raft consensus** for linearizable writes. Every permission change is replicated to a quorum before acknowledgment. Revision tokens — our implementation of Zanzibar's zookies — connect writes to reads with configurable consistency levels:

- **Linearizable**: reflects the most recent committed state
- **Read-your-writes**: clients always see their own changes
- **Bounded staleness**: follower reads with a revision floor for batch workloads

The new enemy problem is solved without Spanner, without TrueTime, and without compromising on consistency.

### Cryptographic Tenant Isolation

InferaDB doesn't rely on application logic to separate tenants. Each vault is encrypted independently with its own AES-256-GCM key hierarchy and its own tamper-evident blockchain for audit logging. **Cross-tenant access is architecturally impossible** — not prevented by a WHERE clause, but by cryptography.

### Beyond Zanzibar's Model

Zanzibar's original model was pure ReBAC — relationships and set operations. Powerful, but insufficient for real-world authorization that also needs attribute checks and custom logic.

InferaDB's **Infera Policy Language (IPL)** unifies ReBAC, RBAC, and ABAC in a single schema with six composable operators. Need "editors of the parent folder, during business hours, excluding suspended accounts"? That's one IPL expression — statically analyzed at deploy time, evaluated in parallel at query time.

For logic beyond declarative rules — risk scoring, geofencing, license validation — **WebAssembly policy modules** execute custom code in a sandboxed, deterministic, fuel-limited runtime. Any language that compiles to WASM. No I/O access. No escape from the security boundary.

## Zanzibar Was Right. We're Finishing the Job.

Google proved that relationship-based authorization is the correct model for complex, evolving organizations. The 2019 paper gave the industry a blueprint. Open-source implementations made it accessible.

But Zanzibar's architecture assumed Spanner — infrastructure that doesn't exist outside Google. Every open-source implementation has been working around that assumption, accepting the latency, consistency, and isolation trade-offs that come with general-purpose databases.

InferaDB removes those trade-offs. **Zanzibar's model, without the general-purpose database ceiling, with cryptographic isolation Google never needed to publish, and with a policy language that goes beyond what Zanzibar's namespace configuration could express.**

If you're evaluating authorization infrastructure — whether you're migrating from a home-grown RBAC system, adopting an existing Zanzibar implementation, or building authorization into an AI agent pipeline — InferaDB is the architecture that Zanzibar pointed toward but couldn't deliver outside Google's walls.

---

Ready to see Zanzibar done right? **[Explore the docs](/docs/)**, **[try the quickstart](/docs/quickstart)**, or **[join the waitlist](/waitlist)** for InferaDB Cloud.
