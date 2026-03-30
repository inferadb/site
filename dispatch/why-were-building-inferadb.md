---
layout: post
title: "InferaDB: Why We're Building a Purpose-Built Authorization Database — InferaDB"
post_title: "InferaDB: Why We're Building a Purpose-Built Authorization Database"
date: 2026-03-20
category: company
description: "Broken access control is OWASP's #1 risk. InferaDB is purpose-built managed authorization infrastructure with sub-microsecond latency."
authors:
  - Evan Sims
  - Jane Sims
---

**Broken access control has been the #1 risk on the OWASP Top 10 since the 2021 edition.** The average breach costs $4.88 million (IBM, 2024), and the root cause is almost always the same: a permission check that was missing, stale, or wrong.

And yet the infrastructure behind those checks has barely changed in decades.

## We Built the Last Generation. We Know Where It Breaks.

Our team built [OpenFGA](https://openfga.dev) at Auth0, then continued the work through the Okta acquisition. We shipped a Zanzibar-inspired relationship-based access control system that thousands of developers adopted.

We saw what worked. More importantly, **we saw what didn't.**

OpenFGA and systems like it were a real step forward in authorization modeling. But they all share the same architectural bottleneck: they're policy engines, not databases. They delegate storage to general-purpose databases. They need external caching to hit acceptable latency. They implement multi-tenancy at the application level instead of the storage level.

These aren't minor implementation details. They're **hard ceilings on performance, security, and operational simplicity.**

## The General-Purpose Database Problem

Every authorization system on the market today sits on top of a general-purpose database. That means every permission check pays the overhead of query parsing, transaction isolation, and storage abstractions designed for workloads that look nothing like permission evaluation.

A simple "can user X access resource Y" query should resolve in microseconds. **Through a general-purpose database, it takes 5-50 milliseconds.**

Caching helps, but it introduces its own failure modes: stale permissions, invalidation bugs, and the fundamental tension between consistency and performance that Google's original Zanzibar paper called the "new enemy problem." When you revoke an admin's access, can you guarantee no replica serves a stale grant? With a cache layer sitting between your policy engine and a general-purpose database, the honest answer is no.

Application-level multi-tenancy is worse. A single bug in tenant isolation logic can expose one customer's permissions to another. These aren't theoretical risks — they're the failure modes we observed repeatedly in production.

## A Database, Not Another Policy Engine

InferaDB is our answer. It's a **purpose-built authorization database** designed from first principles for the permission evaluation workload.

We didn't start with an off-the-shelf database and optimize. We started with the question: what does a storage engine look like when it only needs to answer access control queries?

Here's what we built:

- **Custom B+ tree storage engine** written in Rust — **2.8µs p99 read latency**, over **952,000 operations per second**
- **Raft consensus** for linearizable writes — when a permission is revoked, no replica can serve a stale grant
- **Per-vault cryptographic isolation** with independent AES-256-GCM envelope encryption and its own blockchain for tamper-evident audit logging
- **WASM extensibility** — write custom policy logic in any language that compiles to WebAssembly, without sacrificing the security guarantees of the core system

This is not incremental improvement. It's a different category of infrastructure.

## Why the Distinction Matters

The problems we're solving — sub-microsecond latency, cryptographic tenant isolation, linearizable consistency, tamper-evident audit trails — **cannot be retrofitted** onto a system that delegates storage to a general-purpose database.

They require control over every layer of the stack: from the storage engine to the consensus protocol that replicates writes across regions.

A policy engine can tell you *what* the rules are. Purpose-built infrastructure can enforce them at the speed and consistency level that production systems actually need. That's the gap in the market, and it's the gap we're closing.

## InferaDB Cloud: The Service, Not Just the Engine

The open-source core is one half of the story. **InferaDB Cloud** is the managed service that runs it for you — no deployment, no scaling, no ops. You get an API. We handle infrastructure, replication, upgrades, and audit trail retention.

Start free with 100K checks/month. Scale to millions with usage-based pricing. Never think about the authorization layer again — except when your auditors are impressed by it.

## Open Source, Open Architecture

InferaDB's core engine is dual-licensed under **MIT and Apache-2.0**. We believe authorization infrastructure is too important to be a black box — security-critical systems need to be auditable, forkable, and free from vendor lock-in.

## Get Started

- **Get early access**: [Join the InferaDB Cloud waitlist](/waitlist)
- **Read the docs**: [Quickstart Guide](/docs/quickstart)
- **Explore the source**: [InferaDB on GitHub](https://github.com/inferadb/inferadb)
