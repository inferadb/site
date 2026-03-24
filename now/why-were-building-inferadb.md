---
layout: post
title: "InferaDB: Why We're Building a Purpose-Built Authorization Database — InferaDB"
post_title: "InferaDB: Why We're Building a Purpose-Built Authorization Database"
date: 2026-03-20
category: news
description: "94% of apps fail access control — OWASP's #1 risk. InferaDB is a purpose-built authorization database with 2.8µs p99 latency and 952K ops/sec."
authors:
  - Evan Sims
---

**94% of audited applications fail access control.** It has been the number one risk on the OWASP Top 10 since 2021. The average breach costs $4.88 million, and the root cause is almost always the same: a permission check that was missing, stale, or wrong.

And yet the infrastructure behind those checks has barely changed in decades.

## We Built the Last Generation. We Know Where It Breaks.

Our team built [OpenFGA](https://openfga.dev) at Auth0, then continued the work through the Okta acquisition. We shipped a Zanzibar-inspired relationship-based access control system that thousands of developers adopted.

We saw what worked. More importantly, **we saw what didn't.**

OpenFGA and systems like it were a real step forward in authorization modeling. But they all share the same architectural bottleneck: they're policy engines, not databases. They delegate storage to PostgreSQL or MySQL. They need external caching to hit acceptable latency. They implement multi-tenancy at the application level instead of the storage level.

These aren't minor implementation details. They're **hard ceilings on performance, security, and operational simplicity.**

## The PostgreSQL Problem

Every authorization system on the market today sits on top of a general-purpose database. That means every permission check pays the overhead of query parsing, transaction isolation, and storage abstractions designed for workloads that look nothing like permission evaluation.

A simple "can user X access resource Y" query should resolve in microseconds. **Through PostgreSQL, it takes 5-50 milliseconds.**

Caching helps, but it introduces its own failure modes: stale permissions, invalidation bugs, and the fundamental tension between consistency and performance that Google's original Zanzibar paper called the "new enemy problem." When you revoke an admin's access, can you guarantee no replica serves a stale grant? With a cache layer sitting between your policy engine and PostgreSQL, the honest answer is no.

Application-level multi-tenancy is worse. A single bug in tenant isolation logic can expose one customer's permissions to another. These aren't theoretical risks — they're the failure modes we observed repeatedly in production.

## A Database, Not Another Policy Engine

InferaDB is our answer. It's a **purpose-built authorization database** designed from first principles for the permission evaluation workload.

We didn't start with PostgreSQL and optimize. We started with the question: what does a storage engine look like when it only needs to answer access control queries?

Here's what we built:

- **Custom B+ tree storage engine** written in Rust — **2.8µs p99 read latency**, over **952,000 operations per second**
- **Raft consensus** for linearizable writes — when a permission is revoked, no replica can serve a stale grant
- **Per-vault cryptographic isolation** with independent AES-256-GCM envelope encryption and its own blockchain for tamper-evident audit logging
- **WASM extensibility** — write custom policy logic in any language that compiles to WebAssembly, without sacrificing the security guarantees of the core system

This is not incremental improvement. It's a different category of infrastructure.

## Why the Distinction Matters

The problems we're solving — sub-microsecond latency, cryptographic tenant isolation, linearizable consistency, tamper-evident audit trails — **cannot be retrofitted** onto a system that delegates storage to PostgreSQL.

They require control over every layer of the stack: from the page layout on disk to the consensus protocol that replicates writes across nodes.

A policy engine can tell you *what* the rules are. A database can enforce them at the speed and consistency level that production systems actually need. That's the gap in the market, and it's the gap we're closing.

## Open Source, Open Architecture

InferaDB is dual-licensed under **MIT and Apache-2.0**. The core database is open source. We believe authorization infrastructure is too important to be a black box — security-critical systems need to be auditable, forkable, and free from vendor lock-in.

We're building the authorization layer that modern applications actually need: one that treats permissions as a first-class data problem, not an afterthought bolted onto application code.

## Get Started

If you're tired of duct-taping authorization onto PostgreSQL, we'd like to show you what purpose-built looks like.

- **Try it now**: [Quickstart Guide](/docs/quickstart)
- **Star the repo**: [InferaDB on GitHub](https://github.com/inferadb/inferadb)
- **Join the waitlist** for InferaDB Cloud: [Sign up here](/waitlist)
