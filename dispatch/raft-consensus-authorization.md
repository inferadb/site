---
layout: post
title: "Why Eventual Consistency in Authorization Is a Security Vulnerability"
post_title: "Why Eventual Consistency in Authorization Is a Security Vulnerability"
date: 2026-03-10
category: engineering
description: "Eventual consistency in authorization means stale grants — security violations you can't undo. InferaDB uses Raft consensus with revision tokens to guarantee linearizable writes."
hero: /assets/images/dispatch/raft-consensus.svg
authors:
  - Evan Sims
---

*This post explains why InferaDB Cloud guarantees linearizable consistency for every authorization decision — and why that guarantee is non-negotiable for production systems.*

Alice revokes Bob's access to a document at 10:00:00. At 10:00:01, Bob's request hits a replica that has not yet received the revocation. **The stale replica grants access.** Bob sees the document. The permission was revoked, but the system served a stale grant because eventual consistency allowed a window where different replicas disagreed about the state of the world.

This is not a hypothetical. Google's Zanzibar paper named it the **"new enemy problem"**, and it remains the defining consistency challenge in authorization systems.

## Why Authorization Cannot Tolerate Staleness

In most distributed systems, temporary inconsistency is acceptable. A social media post appearing a few seconds late is not a security incident. **In authorization, a stale grant is a security violation** — and no amount of eventual convergence can undo the unauthorized access that already occurred.

The window between a permission revocation and its propagation to all replicas is not a latency issue. It is a **security exposure**. Every millisecond of that window is a period during which your system is actively granting access it should be denying.

## How InferaDB's Write Path Works

InferaDB addresses this through **Raft consensus**, which provides linearizable writes across the cluster. Every write — creating a relationship tuple, modifying a type definition, updating a policy — flows through a deterministic path:

1. **Client sends write to the Raft leader**
2. **Leader appends the entry** to its log
3. **Leader replicates via AppendEntries** RPCs to followers
4. **Quorum of nodes durably stores** the entry
5. **Leader commits and applies** the entry to the B+ tree storage engine
6. **A block is appended** to the vault's blockchain with a `state_root` derived from the current Merkle tree

Once a write is acknowledged to the client, it is **guaranteed to be durable and visible** on any node that serves reads at or after that revision. There is no window of inconsistency. There is no stale grant.

## Adaptive Batching for Write Throughput

Individual writes are small — a single relationship tuple is typically under 200 bytes — but they arrive at high frequency during bulk operations like role migrations or organizational restructuring.

The Raft leader uses **adaptive batching**: accumulating pending entries and flushing them in batches to amortize the cost of disk fsync and network round-trips. The batch size adjusts dynamically based on write arrival rate.

The result:

- **p50 write latency: 3-4ms**
- **p99 write latency: 10-15ms**

These numbers reflect the **fundamental cost of distributed consensus** — a network round-trip to a quorum plus a durable write. They cannot be meaningfully reduced without sacrificing the consistency guarantee. For authorization, this is the right trade-off: writes are less frequent than reads by orders of magnitude, and the cost of a stale grant far exceeds the cost of a few extra milliseconds on the write path.

## Revision Tokens: Connecting Writes to Reads

Revision tokens are the mechanism that bridges write consistency and read consistency. Every committed Raft entry increments a **monotonically increasing revision counter**. When a client performs a write, the response includes the revision token at which the write became visible.

This enables three consistency levels, selectable per request:

**Linearizable reads.** The strongest guarantee. The response reflects the most recent committed state. The leader serves these directly since it always holds the most up-to-date log. Use this when a permission change must be immediately reflected.

**Read-your-writes.** Clients pass their most recent revision token on subsequent reads, guaranteeing they observe at least that revision. This is the default for most workloads — you always see your own changes, but you do not pay for a leader round-trip on every read.

**Bounded staleness.** Follower reads with a revision floor. For batch evaluations where the relevant policies have not changed recently, this provides **lower latency** by avoiding the round-trip to the leader. You set the bound; InferaDB enforces it.

## Cross-Region Consistency

A Raft group spans nodes within a region for low-latency consensus. But organizations operating across regions need **causal ordering guarantees**: if a permission is granted in region A, an action that depends on that permission in region B must observe the grant.

InferaDB achieves this through **causal consistency tokens** that encode the revision state across regions. When a write in region A is acknowledged, the client receives a token that, when presented to region B, ensures that region B will not serve a response that is causally prior to the write.

This allows cross-region authorization workflows to maintain correctness **without requiring every read to contact every region** — which would defeat the purpose of geographic distribution.

## The Core Trade-Off

Authorization consistency is not a knob you tune for performance. It is a **security property**. Every authorization system that uses eventual consistency has a window during which it will serve stale grants. The only question is whether you are willing to accept that window.

InferaDB is built on the premise that the answer is no. Linearizable writes, configurable read consistency, and revision tokens give you the tools to eliminate stale grants entirely — without sacrificing the read performance that authorization demands.

---

Ready to eliminate stale grants from your authorization layer? **[Explore the docs](/docs/)** or **[get started with InferaDB](/docs/quickstart)**.
