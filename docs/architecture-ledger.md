---
layout: docs
title: Ledger Architecture — InferaDB
doc_title: Ledger Architecture
doc_subtitle: Deep dive into InferaDB's storage layer — a per-vault blockchain with Raft consensus.
---

## Overview

The Ledger is InferaDB's **storage layer**. It provides durable, replicated, and cryptographically verifiable storage for all authorization data. Every write is committed to a per-vault blockchain via Raft consensus, producing Merkle proofs that enable independent verification of data integrity.

## Consensus

The Ledger uses [OpenRaft](https://github.com/databendlabs/openraft) for Raft consensus. A cluster requires an odd number of nodes (typically 3 or 5) to maintain quorum. The leader handles all writes; reads can be served by any node depending on consistency requirements.

## Storage Engine

The Ledger implements a **custom B+ tree storage engine** purpose-built for authorization workloads:

| Property       | Detail                                   |
| -------------- | ---------------------------------------- |
| Tables         | 21 internal tables                       |
| Write model    | Single-writer (serialized through Raft)  |
| Page checksums | XXHash per page for corruption detection |
| Compression    | zstd for snapshots                       |

### Key Format

All keys in the storage engine follow a composite format:

```
vault_id (8 bytes) + bucket_id (1 byte) + local_key (variable)
```

This layout ensures vault-level data locality and enables efficient range scans within a single vault.

## State Root and Merkle Proofs

### State Root Computation

The Ledger maintains a **bucket-based state root** with 256 buckets. Each key is assigned to a bucket based on its hash. The state root is computed incrementally — only buckets affected by a write are recomputed, keeping the overhead constant regardless of total data size.

### Merkle Proofs

The Ledger supports two types of verifiable proofs:

| Proof Type            | Verifiable? | Description                                               |
| --------------------- | ----------- | --------------------------------------------------------- |
| Point read            | Yes         | Prove that a specific key has a specific value            |
| Transaction inclusion | Yes         | Prove that a transaction was included in a specific block |
| List operation        | No          | List results are not individually provable                |

Clients can independently verify point reads and transaction inclusion without trusting the Ledger nodes.

## Write Path

```
Client
  → Leader node
    → Raft AppendEntries to followers
      → Quorum acknowledgment
        → Commit to local B+ tree
          → Produce block with state_root
            → Return revision token to client
```

Every committed write produces a new block that includes the updated `state_root`, linking it to the chain of previous blocks for that vault.

### Write Latency

| Percentile | Latency   |
| ---------- | --------- |
| p50        | ~3–4 ms   |
| p99        | ~10–15 ms |

### Adaptive Batching

The Ledger batches writes to improve throughput under load:

| Parameter      | Default | Description                                    |
| -------------- | ------- | ---------------------------------------------- |
| Max batch size | 100     | Maximum writes per batch                       |
| Batch timeout  | 5 ms    | Maximum wait time before flushing a batch      |
| Eager commit   | On      | Commit immediately when a single write arrives |

With eager commit enabled (the default), single writes are committed immediately without waiting for a batch to fill. Under high write throughput, writes are automatically batched up to the configured maximum.

## Idempotency

The Ledger implements **two-tier idempotency** to safely handle retried requests:

1. **In-memory cache** — A Moka LRU cache holds recent idempotency keys for fast deduplication of immediate retries.
2. **Replicated entries** — Idempotency keys are persisted through Raft, so deduplication survives leader failover.

## Snapshots

| Property         | Detail                                  |
| ---------------- | --------------------------------------- |
| Format           | Binary, zstd-compressed                 |
| Trigger interval | Every 5 minutes or 10,000 blocks        |
| Purpose          | Faster node recovery and log compaction |

Snapshots capture the full state of the B+ tree at a point in time. New nodes joining the cluster receive a snapshot instead of replaying the entire Raft log.

## Vault Health Monitoring

The Ledger continuously monitors the health of each vault's chain:

- Detects gaps in the block sequence
- Validates page checksums on read
- Triggers **auto-recovery** from peer replicas when corruption is detected

## Multi-Region Deployment

The Ledger supports multi-region deployments using **independent Raft groups per region**. Each region operates its own consensus group, and data residency is enforced at the vault level:

```bash
# Pin a Ledger node to a specific region
inferadb-ledger --region us-east-1
```

Vaults are assigned to a region at creation time. The Ledger ensures that vault data is only stored on nodes within the designated region, enabling compliance with data residency requirements (GDPR, etc.).
