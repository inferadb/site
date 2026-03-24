---
layout: docs
title: Quick Start — InferaDB
doc_title: Quick Start
doc_subtitle: Run InferaDB locally and make your first authorization check.
---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed and running
- [inferadb CLI](https://github.com/inferadb/cli) (install via `cargo install inferadb-cli`)

## 1. Start InferaDB Locally

The fastest way to start is with the CLI's built-in development environment:

```bash
inferadb dev start
```

This bootstraps a complete local stack — Engine, Control, Ledger, and Dashboard — using Docker. Ports:

| Service       | Port             |
| ------------- | ---------------- |
| Engine (REST) | `localhost:8080` |
| Engine (gRPC) | `localhost:8081` |
| Control       | `localhost:9090` |
| Dashboard     | `localhost:3000` |

Alternatively, run the Engine directly with Docker and the in-memory storage backend:

```bash
docker run -p 8080:8080 -p 8081:8081 inferadb/inferadb-engine:latest
```

## 2. Define a Schema

Create a file called `schema.ipl` with your authorization model:

```
type user {}

type team {
    relation member
}

type document {
    relation viewer
    relation editor
    relation owner
    relation can_view = viewer | editor | owner
    relation can_edit = editor | owner
}
```

Push the schema:

```bash
inferadb schemas push schema.ipl
```

## 3. Write Relationships

Add authorization data as relationship tuples:

```bash
inferadb relationships add user:alice editor document:readme
inferadb relationships add user:bob viewer document:readme
```

## 4. Check Permissions

```bash
# Alice can edit (she's an editor)
inferadb check document:readme can_edit user:alice
# ✓ ALLOWED  2.1ms · revision r_1

# Bob cannot edit (he's only a viewer)
inferadb check document:readme can_edit user:bob
# ✗ DENIED   1.8ms · revision r_1

# Bob can view (viewers have can_view)
inferadb check document:readme can_view user:bob
# ✓ ALLOWED  1.9ms · revision r_1
```

Exit codes: `0` = allowed, `20` = denied, `21` = indeterminate.

## 5. Simulate Changes

Test hypothetical changes without writing them:

```bash
inferadb simulate \
    --add "user:charlie viewer document:readme" \
    --check "document:readme can_view user:charlie"
# ✓ ALLOWED (simulated)
```

## 6. Use the REST API Directly

```bash
# Check permission via AuthZEN endpoint
curl -X POST http://localhost:8080/access/v1/evaluation \
  -H "Content-Type: application/json" \
  -d '{
    "subject": {"type": "user", "id": "alice"},
    "action": {"name": "can_edit"},
    "resource": {"type": "document", "id": "readme"}
  }'
```

Response:

```json
{
  "decision": true
}
```

## What's Next?

- [Core Concepts](/docs/concepts) — Understand entities, relations, tuples, and revision tokens
- [IPL Overview](/docs/ipl) — Learn the full policy language syntax
- [REST API Reference](/docs/api-rest) — Explore all available endpoints
- [Rust SDK](/docs/sdk-rust) — Integrate InferaDB into your application
