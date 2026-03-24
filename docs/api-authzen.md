---
layout: docs
title: AuthZEN API — InferaDB
doc_title: AuthZEN API
doc_subtitle: OpenID Foundation Authorization API specification endpoints.
---

InferaDB implements the [OpenID AuthZEN](https://openid.net/wg/authzen/) specification — the industry's first standardized authorization API. AuthZEN enables vendor-neutral interoperability, meaning you can swap authorization providers without changing your integration code.

## Service Discovery

```
GET /.well-known/authzen-configuration
```

Returns the capabilities of this InferaDB instance, including supported endpoints and extensions.

## Evaluation

### Single Check

```
POST /access/v1/evaluation
```

**Request:**

```json
{
  "subject": {
    "type": "user",
    "id": "alice"
  },
  "action": {
    "name": "can_edit"
  },
  "resource": {
    "type": "document",
    "id": "readme"
  }
}
```

**Response:**

```json
{
  "decision": true
}
```

### Batch Check

```
POST /access/v1/evaluations
```

Evaluate up to 100 authorization checks in a single request.

**Request:**

```json
{
  "evaluations": [
    {
      "subject": { "type": "user", "id": "alice" },
      "action": { "name": "can_edit" },
      "resource": { "type": "document", "id": "readme" }
    },
    {
      "subject": { "type": "user", "id": "bob" },
      "action": { "name": "can_view" },
      "resource": { "type": "document", "id": "readme" }
    }
  ]
}
```

## Resource Search

```
POST /access/v1/search/resource
```

Find resources accessible by a subject with a given action.

## Subject Search

```
POST /access/v1/search/subject
```

Find subjects with access to a resource for a given action.

## InferaDB Extensions

InferaDB advertises additional capabilities beyond the AuthZEN base spec via the well-known endpoint:

| Extension                          | Description                            |
| ---------------------------------- | -------------------------------------- |
| `inferadb_relationship_management` | Direct CRUD for relationship tuples    |
| `inferadb_relation_expansion`      | Expand relation trees                  |
| `inferadb_simulation`              | What-if testing with ephemeral data    |
| `inferadb_realtime_streaming`      | Real-time change notifications via SSE |

## Identifier Format

AuthZEN uses typed identifiers (`{"type": "user", "id": "alice"}`), while InferaDB's native API uses string format (`"user:alice"`). Both formats are fully supported — use whichever matches your integration.
