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

## 7. Integrate with Your Application

The CLI and REST API are great for exploration. For production, use an SDK. Here's the same permission check from your application code:

<div class="code-tabs">
  <div class="code-tabs-nav">
    <button class="active" data-lang="rust">Rust</button>
    <button data-lang="typescript">TypeScript</button>
    <button data-lang="go">Go</button>
    <button data-lang="python">Python</button>
  </div>
  <div class="code-tabs-panel active" data-lang="rust">

~~~rust
use inferadb::Client;

let client = Client::builder()
    .url("http://localhost:8080")
    .api_key("dev")
    .build()
    .await?;

let vault = client.organization("default").vault("default");

let allowed = vault
    .check("user:alice", "can_edit", "document:readme")
    .await?;

assert!(allowed);
~~~

  </div>
  <div class="code-tabs-panel" data-lang="typescript">

~~~typescript
import { InferaDB } from "@inferadb/sdk";

const client = new InferaDB({
  url: "http://localhost:8080",
  apiKey: "dev",
});

const vault = client.organization("default").vault("default");

const allowed = await vault.check(
  "user:alice",
  "can_edit",
  "document:readme"
);

console.log(allowed); // true
~~~

  </div>
  <div class="code-tabs-panel" data-lang="go">

~~~go
client, _ := inferadb.NewClient(
    inferadb.WithURL("http://localhost:8080"),
    inferadb.WithAPIKey("dev"),
)
defer client.Close()

vault := client.Organization("default").Vault("default")

allowed, _ := vault.Check(ctx, "user:alice", "can_edit", "document:readme")

fmt.Println(allowed) // true
~~~

  </div>
  <div class="code-tabs-panel" data-lang="python">

~~~python
from inferadb import InferaDB

client = InferaDB(
    url="http://localhost:8080",
    api_key="dev",
)

vault = client.organization("default").vault("default")

allowed = await vault.check("user:alice", "can_edit", "document:readme")

print(allowed)  # True
~~~

  </div>
</div>

See the full SDK documentation for authentication, error handling, and framework integrations: [Rust](/docs/sdk-rust) · [TypeScript](/docs/sdk-typescript) · [Go](/docs/sdk-go) · [Python](/docs/sdk-python) · [All SDKs](/docs/)

## What's Next?

- [Core Concepts](/docs/concepts) — Understand entities, relations, tuples, and revision tokens
- [Modeling Guide](/docs/modeling) — Design a complete authorization schema for a real application
- [IPL Overview](/docs/ipl) — Learn the full policy language syntax
- [SDK Documentation](/docs/) — Full SDK docs for all 10 supported languages
