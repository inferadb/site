---
layout: post
title: "1,000x Faster Permission Checks"
post_title: "How InferaDB Achieves 1,000x Faster Permission Checks"
date: 2026-03-12
last_modified_at: 2026-03-12
category: engineering
description: "InferaDB's custom Rust B+ tree delivers 2.8us p99 reads and 952K ops/sec with per-page AES-256-GCM encryption."
hero: /assets/images/dispatch/b-plus-tree.svg
authors:
  - Evan Sims
---

*You don't need to understand any of this to use InferaDB — this is what runs under the hood of InferaDB Cloud. But if you care about why your authorization checks resolve in microseconds instead of milliseconds, read on.*

**2.8 microseconds.** That is InferaDB's p99 read latency for a permission check — roughly the time it takes light to travel 840 meters. A typical authorization check through a general-purpose database? 5 to 50 milliseconds. That is not an incremental improvement. It is a **1,000x reduction** that moves authorization from a visible bottleneck to an invisible operation.

We did not get there with off-the-shelf components.

## Why We Built a Custom Storage Engine

Permission checks sit in the **hot path of every API request**, every page load, every agent action. They must be fast enough to be invisible. We benchmarked the alternatives — PostgreSQL, MySQL, SQLite, RocksDB, LMDB — and none met our requirements for the authorization workload.

General-purpose databases pay overhead for features authorization does not need: query parsing, transaction isolation, schema flexibility, multi-statement transactions. We needed an engine designed exclusively for the authorization access pattern: **point lookups, range scans over relationship tuples, and append-only writes** serialized through Raft consensus.

So we built one from scratch in Rust.

## The Architecture: 21 Tables, Zero MVCC

InferaDB's B+ tree manages **21 fixed tables** covering every data structure the system needs: relationship tuples, type definitions, changelog entries, vault metadata, and more. The table set is fixed at compile time, which eliminates the overhead of dynamic schema management.

Because all writes are serialized through the Raft log, the storage engine operates as a **single-writer system**. This is not a limitation — it is a deliberate architectural choice that eliminates an entire class of complexity. There is no need for multi-version concurrency control, no write-ahead logging for crash recovery (the Raft log serves that purpose), and no lock managers. Reads are lock-free and proceed concurrently without coordination.

## Key Format: Tenant Isolation Baked Into the Byte Layout

Every key in the tree encodes tenant isolation directly into its structure:

- **Vault ID** (8 bytes) — tenant identifier
- **Bucket ID** (1 byte) — table identifier
- **Local key** — table-specific key data

This layout means all data for a single tenant is **physically co-located on disk**, optimizing range scans for relationship traversal. More importantly, cross-tenant data access requires constructing a key with a different vault prefix — something the storage engine can reject structurally rather than through application-level checks.

Every page is independently encrypted with **AES-256-GCM envelope encryption** and verified with **XXH3 checksums** on every read. Corruption is detected at the page level before any data reaches the query layer.

## Two-Layer Caching: From Disk to Decision

The caching architecture operates in two layers, each targeting a different access pattern.

**Layer 1: Page cache.** Deserialized B+ tree pages are held in memory, avoiding repeated disk reads and deserialization for hot pages. This is the fast path for novel queries that need to traverse the tree.

**Layer 2: Evaluation cache.** Complete authorization results — the fully resolved answer to "can user X perform action Y on resource Z" — are cached by query parameters and the current revision token. When many items share the same access policy (common in list-filtering scenarios), repeated checks resolve from this cache **without touching the tree at all**.

The two layers compose: novel queries miss the evaluation cache but hit the page cache for their tree traversal. Repeated queries never reach the tree.

## Lock-Free I/O with pread/pwrite

All I/O operations use **position-based system calls** — `pread` and `pwrite` on Unix. These read and write specific byte ranges without maintaining file position state or holding file descriptor locks.

Combined with the single-writer model, read operations **never block on writes** and never contend for I/O resources. There is no lock acquisition in the read path. Period.

## The Numbers

The result of these design choices on our benchmark hardware:

- **2.8µs p99 read latency**
- **952,000 operations per second**

For context, an authorization check through a general-purpose database takes 5 to 50 milliseconds depending on query complexity and cache state. That gap is the difference between authorization being a **measurable bottleneck** in your application and authorization being invisible.

At these speeds, you can run a permission check on every row in a 10,000-item list response and add less than 30 milliseconds to total request time. With a general-purpose database, that same operation could take 50 to 500 seconds.

## What This Means for Your Architecture

Sub-microsecond authorization changes what is architecturally possible. You stop batching permission checks. You stop pre-computing access lists. You stop caching authorization decisions in your application layer (where they go stale). You check permissions **inline, in real time, on every request** — and your users never notice.

That is what authorization should feel like: not a tax on every request, but a guarantee that is too fast to measure.

---

Want to see these numbers on your workload? **[Join the InferaDB Cloud waitlist](/waitlist)** for managed authorization at microsecond speed — or **[explore the open-source benchmarks](/docs/quickstart)** yourself.
