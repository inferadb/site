---
layout: docs
title: Quick Start — InferaDB
doc_title: Quick Start
doc_subtitle: Run InferaDB locally and make your first authorization check.
last_updated: 2026-03-24
related:
  - /docs/concepts
  - /docs/deploy-local
  - /docs/modeling
---

{% include docs-callout.html type="info" title="Prerequisites" body="You need Docker installed to follow this guide. InferaDB requires no other dependencies." %}

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed and running
- [inferadb CLI](https://github.com/inferadb/cli) (install via `cargo install inferadb-cli`)

## Install the CLI

{% include docs-tabs.html id="install" tab1_name="Shell" tab1_lang="bash" tab1_code="curl -fsSL https://inferadb.com/install | sh" tab2_name="Docker" tab2_lang="bash" tab2_code="docker pull inferadb/inferadb:latest" tab3_name="Cargo" tab3_lang="bash" tab3_code="cargo install inferadb-cli" %}

## 1. Start InferaDB Locally

```bash
inferadb dev start
```

This starts a complete local stack (Engine, Control, Ledger, Dashboard) via Docker:

| Service       | Port             |
| ------------- | ---------------- |
| Engine (REST) | `localhost:8080` |
| Engine (gRPC) | `localhost:8081` |
| Control       | `localhost:9090` |
| Dashboard     | `localhost:3000` |

Or run the Engine standalone with in-memory storage:

```bash
docker run -p 8080:8080 -p 8081:8081 inferadb/inferadb-engine:latest
```

## 2. Define a Schema

Create `schema.ipl` with your authorization model:

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

Push it:

```bash
inferadb schemas push schema.ipl
```

## 3. Write Relationships

Add relationship tuples:

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

Test hypothetical changes without persisting them:

```bash
inferadb simulate \
    --add "user:charlie viewer document:readme" \
    --check "document:readme can_view user:charlie"
# ✓ ALLOWED (simulated)
```

## 6. Use the REST API

```bash
# AuthZEN evaluation endpoint
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

> **Note:** `inferadb dev start` runs without authentication. For production, include an `Authorization: Bearer <token>` header. See [Authentication](/docs/authentication).

## 7. Integrate with Your Application

For production, use an SDK. The same permission check:

<div class="code-tabs">
  <div class="code-tabs-nav">
    <button class="active" data-lang="python" data-sdk-url="/docs/sdk-python" data-sdk-name="Python SDK">Python</button>
    <button data-lang="typescript" data-sdk-url="/docs/sdk-typescript" data-sdk-name="TypeScript SDK">TypeScript</button>
    <button data-lang="java" data-sdk-url="/docs/sdk-java" data-sdk-name="Java SDK">Java</button>
    <button data-lang="csharp" data-sdk-url="/docs/sdk-dotnet" data-sdk-name=".NET SDK">C#</button>
    <button data-lang="go" data-sdk-url="/docs/sdk-go" data-sdk-name="Go SDK">Go</button>
    <button data-lang="rust" data-sdk-url="/docs/sdk-rust" data-sdk-name="Rust SDK">Rust</button>
    <button data-lang="php" data-sdk-url="/docs/sdk-php" data-sdk-name="PHP SDK">PHP</button>
    <button data-lang="ruby" data-sdk-url="/docs/sdk-ruby" data-sdk-name="Ruby SDK">Ruby</button>
    <button data-lang="cpp" data-sdk-url="/docs/sdk-c" data-sdk-name="C/C++ SDK">C++</button>
    <button data-lang="elixir" data-sdk-url="/docs/sdk-elixir" data-sdk-name="Elixir SDK">Elixir</button>
  </div>
  <div class="code-tabs-panel active" data-lang="python" markdown="1">

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
  <div class="code-tabs-panel" data-lang="typescript" markdown="1">

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
  <div class="code-tabs-panel" data-lang="java" markdown="1">

~~~java
import com.inferadb.InferaDB;

var client = InferaDB.builder()
    .url("http://localhost:8080")
    .apiKey("dev")
    .build();

var vault = client.organization("default").vault("default");

boolean allowed = vault.check("user:alice", "can_edit", "document:readme");

System.out.println(allowed); // true
~~~

  </div>
  <div class="code-tabs-panel" data-lang="csharp" markdown="1">

~~~csharp
using InferaDB;

var client = new InferaDBClient(new InferaDBOptions
{
    Url = "http://localhost:8080",
    ApiKey = "dev",
});

var vault = client.Organization("default").Vault("default");

var allowed = await vault.CheckAsync("user:alice", "can_edit", "document:readme");

Console.WriteLine(allowed); // True
~~~

  </div>
  <div class="code-tabs-panel" data-lang="go" markdown="1">

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
  <div class="code-tabs-panel" data-lang="rust" markdown="1">

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
  <div class="code-tabs-panel" data-lang="php" markdown="1">

~~~php
use InferaDB\InferaDB;

$client = InferaDB::builder()
    ->url('http://localhost:8080')
    ->apiKey('dev')
    ->build();

$vault = $client->organization('default')->vault('default');

$allowed = $vault->check('user:alice', 'can_edit', 'document:readme');

var_dump($allowed); // bool(true)
~~~

  </div>
  <div class="code-tabs-panel" data-lang="ruby" markdown="1">

~~~ruby
require "inferadb"

client = InferaDB::Client.new(
  url: "http://localhost:8080",
  api_key: "dev"
)

vault = client.organization("default").vault("default")

allowed = vault.check("user:alice", "can_edit", "document:readme")

puts allowed # true
~~~

  </div>
  <div class="code-tabs-panel" data-lang="cpp" markdown="1">

~~~cpp
#include <inferadb.hpp>

auto client = inferadb::Client::builder()
    .url("http://localhost:8080")
    .api_key("dev")
    .build();

auto vault = client.organization("default").vault("default");

bool allowed = vault.check("user:alice", "can_edit", "document:readme");

std::cout << std::boolalpha << allowed << std::endl; // true
~~~

  </div>
  <div class="code-tabs-panel" data-lang="elixir" markdown="1">

~~~elixir
client = InferaDB.client(
  url: "http://localhost:8080",
  api_key: "dev"
)

vault = InferaDB.organization(client, "default") |> InferaDB.vault("default")

{:ok, allowed} = InferaDB.check(vault, "user:alice", "can_edit", "document:readme")

IO.inspect(allowed) # true
~~~

  </div>
  <div class="code-tabs-sdk-link">
    See the <a href="/docs/sdk-python">Python SDK</a> docs for authentication, error handling, and framework integrations.
  </div>
</div>

## What's Next?

- [Core Concepts](/docs/concepts) — Understand entities, relations, tuples, and revision tokens
- [Modeling Guide](/docs/modeling) — Design a complete authorization schema for a real application
- [IPL Overview](/docs/ipl) — Learn the full policy language syntax
- [SDK Documentation](/docs/) — Full SDK docs for all 10 supported languages
