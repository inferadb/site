---
layout: docs
title: Ledger Architecture
doc_title: Ledger Architecture
doc_subtitle: Deep dive into InferaDB's storage layer — a per-vault blockchain with Raft consensus.
---

## Overview

The Ledger is InferaDB's **storage layer**. It provides durable, replicated, cryptographically verifiable storage for all authorization data. Every write commits to a per-vault blockchain via Raft, producing Merkle proofs for independent integrity verification.

## Consensus

The Ledger uses [OpenRaft](https://github.com/databendlabs/openraft). Clusters require an odd number of nodes (typically 3 or 5). The leader handles all writes; reads can be served by any node depending on consistency requirements.

## Storage Engine

Custom B+ tree storage engine built for authorization workloads:

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

This ensures vault-level data locality and efficient per-vault range scans.

## State Root and Merkle Proofs

### State Root Computation

256-bucket state root, updated incrementally. Only buckets affected by a write are recomputed, keeping overhead constant regardless of data size.

### Merkle Proofs

| Proof Type            | Verifiable? | Description                                               |
| --------------------- | ----------- | --------------------------------------------------------- |
| Point read            | Yes         | Prove that a specific key has a specific value            |
| Transaction inclusion | Yes         | Prove that a transaction was included in a specific block |
| List operation        | No          | List results are not individually provable                |

Clients can verify point reads and transaction inclusion without trusting any Ledger node.

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

Each committed write produces a block with the updated `state_root`, linked to the vault's chain.

### Write Latency

| Percentile | Latency   |
| ---------- | --------- |
| p50        | ~3–4 ms   |
| p99        | ~10–15 ms |

### Adaptive Batching

Writes are batched under load:

| Parameter      | Default | Description                                    |
| -------------- | ------- | ---------------------------------------------- |
| Max batch size | 100     | Maximum writes per batch                       |
| Batch timeout  | 5 ms    | Maximum wait time before flushing a batch      |
| Eager commit   | On      | Commit immediately when a single write arrives |

With eager commit (default), single writes commit immediately. Under high throughput, writes batch automatically.

## Idempotency

**Two-tier idempotency** for safe retries:

1. **In-memory cache** — Moka LRU for fast deduplication of immediate retries
2. **Replicated entries** — Idempotency keys persisted through Raft, surviving leader failover

## Snapshots

| Property         | Detail                                  |
| ---------------- | --------------------------------------- |
| Format           | Binary, zstd-compressed                 |
| Trigger interval | Every 5 minutes or 10,000 blocks        |
| Purpose          | Faster node recovery and log compaction |

New nodes receive a snapshot instead of replaying the entire Raft log.

## Vault Health Monitoring

Continuous per-vault chain health monitoring:

- Detects gaps in the block sequence
- Validates page checksums on read
- Triggers **auto-recovery** from peer replicas when corruption is detected

## Multi-Region Deployment

**Independent Raft groups per region.** Data residency is enforced at the vault level:

```bash
# Pin a Ledger node to a specific region
inferadb-ledger --region us-east-1
```

Vaults are pinned to a region at creation. Data is stored only on nodes within that region for GDPR and data residency compliance.
