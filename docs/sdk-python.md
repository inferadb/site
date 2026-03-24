---
layout: docs
title: Python SDK — InferaDB
doc_title: Python SDK
doc_subtitle: Async and sync Python client for InferaDB.
---

> **Coming soon.** The Python SDK is under active development. The API surface shown here is based on the [Rust SDK](/docs/sdk-rust) and may change before release.

The official Python SDK (`inferadb`) provides both async (`asyncio`) and synchronous clients for InferaDB's authorization APIs. Requires Python 3.10+.

## Installation

```bash
pip install inferadb
```

## Authentication

Three authentication methods:

| Method | Use Case | Security |
|--------|----------|----------|
| Client Credentials (Ed25519 JWT) | Service-to-service | High |
| Bearer Token | User sessions, OAuth | Medium |
| API Key | Testing, simple integrations | Basic |

### Client Credentials (Recommended)

```python
from inferadb import InferaDB, Ed25519PrivateKey

client = InferaDB(
    url="https://engine.inferadb.com",
    credentials={
        "client_id": "my-client",
        "private_key": Ed25519PrivateKey.from_pem_file("client.pem"),
        "certificate_id": "cert-id",
    },
)
```

### Bearer Token

```python
import os
from inferadb import InferaDB

client = InferaDB(
    url="https://engine.inferadb.com",
    token=os.environ["INFERADB_TOKEN"],
)
```

### API Key

```python
import os
from inferadb import InferaDB

client = InferaDB(
    url="https://engine.inferadb.com",
    api_key=os.environ["INFERADB_API_KEY"],
)
```

## Permission Checks

### Async API

```python
vault = client.organization("my-org").vault("production")

# Simple check
allowed = await vault.check("user:alice", "can_edit", "document:readme")
```

### With ABAC Context

```python
allowed = await vault.check(
    "user:alice", "can_view", "document:readme",
    context={"ip_address": "10.0.0.1"},
)
```

### Require — Raises on Deny

```python
# Raises AccessDeniedError if permission is denied
await vault.require("user:alice", "can_edit", "document:readme")
```

### With Consistency Token

```python
allowed = await vault.check(
    "user:alice", "can_view", "document:readme",
    at_least_as_fresh=revision_token,
)
```

### Batch Check

```python
results = await vault.check_batch([
    ("user:alice", "can_edit", "document:readme"),
    ("user:bob", "can_view", "document:readme"),
])
assert results.all_allowed()
```

### Sync API

```python
from inferadb import InferaDBSync

client = InferaDBSync(url="https://engine.inferadb.com", token="...")
vault = client.organization("my-org").vault("production")

allowed = vault.check("user:alice", "can_edit", "document:readme")
```

## Relationships

### Write

```python
# Returns a revision token
token = await vault.relationships.write(
    resource="document:readme",
    relation="editor",
    subject="user:alice",
)
```

### Batch Write

```python
await vault.relationships.write_batch([
    {"resource": "document:readme", "relation": "editor", "subject": "user:alice"},
    {"resource": "document:readme", "relation": "viewer", "subject": "user:bob"},
])
```

### List

```python
rels = await vault.relationships.list(resource="document:readme")
```

### Delete

```python
await vault.relationships.delete_where(
    resource="document:readme",
    relation="viewer",
    subject="user:bob",
)
```

## Lookups

```python
# What resources can Alice view?
resources = await vault.resources.accessible_by(
    "user:alice",
    permission="can_view",
    resource_type="document",
)

# Who can edit this document?
subjects = await vault.subjects.with_permission(
    "can_edit",
    resource="document:readme",
)
```

## Testing

Three approaches with different trade-offs:

### MockClient (Fastest)

```python
from inferadb.testing import MockClient

client = (
    MockClient()
    .on_check("user:alice", "can_edit", "document:readme").allow()
    .on_check("user:bob", "can_edit", "document:readme").deny()
    .on_check_any_subject("can_view", "document:readme").allow()
    .default_deny()
    .verify_on_drop(True)
)
```

Setting `verify_on_drop(True)` asserts that all registered expectations were invoked when the client is garbage collected.

### InMemoryClient (Full Policy Evaluation)

The `InMemoryClient` evaluates policies locally with no I/O. Construction is synchronous:

```python
from inferadb.testing import InMemoryClient

client = InMemoryClient.with_schema_and_data(
    schema="""
    type document {
        relation viewer
        relation editor
        relation can_view = viewer | editor
    }
    """,
    data=[
        ("document:readme", "editor", "user:alice"),
        ("document:readme", "viewer", "user:bob"),
    ],
)
```

### TestVault (Real Instance)

```python
from inferadb.testing import TestVault

vault = await TestVault.create(org, schema=schema_ipl)
# vault auto-cleans up when garbage collected
# call vault.preserve() to keep data for debugging
```

### pytest Integration

```python
import pytest
import pytest_asyncio
from inferadb.testing import InMemoryClient

@pytest_asyncio.fixture
async def authz():
    return InMemoryClient.with_schema_and_data(
        schema="...",
        data=[("document:readme", "editor", "user:alice")],
    )

@pytest.mark.asyncio
async def test_alice_can_edit(authz):
    vault = authz.organization("test").vault("test")
    assert await vault.check("user:alice", "can_edit", "document:readme")
```

## Error Handling

```python
from inferadb import AccessDeniedError, InferaDBError

try:
    await vault.require("user:alice", "can_edit", "document:readme")
except AccessDeniedError:
    # permission denied
    pass
except InferaDBError as e:
    if e.is_retriable:
        # retry after e.retry_after seconds
        pass
    print(e.kind, e.request_id)
```

`ErrorKind` values: `"unauthorized"`, `"forbidden"`, `"not_found"`, `"rate_limited"`, `"schema_violation"`, `"unavailable"`, `"timeout"`, `"invalid_argument"`.

## Framework Integrations

### FastAPI Dependency

```python
from fastapi import Depends, Request
from inferadb.fastapi import require_permission

@app.get("/documents/{doc_id}")
async def get_document(
    doc_id: str,
    request: Request,
    _=Depends(require_permission(
        vault,
        subject=lambda req: f"user:{req.state.user_id}",
        permission="can_view",
    )),
):
    return {"id": doc_id}
```

The `require_permission` dependency resolves the resource from the path parameters automatically via the route definition. Pass an explicit `resource` callback to override:

```python
require_permission(
    vault,
    subject=lambda req: f"user:{req.state.user_id}",
    resource=lambda req: f"document:{req.path_params['doc_id']}",
    permission="can_view",
)
```

### Django Decorator

```python
from inferadb.django import require_permission

@require_permission(
    vault,
    subject=lambda request: f"user:{request.user.id}",
    resource=lambda request, pk: f"document:{pk}",
    permission="can_edit",
)
def update_document(request, pk):
    # only reached if authorized
    pass
```
