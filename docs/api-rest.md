---
layout: docs
title: REST API — InferaDB
doc_title: REST API Reference
doc_subtitle: HTTP endpoints for the InferaDB Engine.
---

The Engine exposes a REST API on port **8080** (default). All endpoints accept and return JSON.

## Authentication

All endpoints except health checks require authentication via Bearer token (JWT) or client certificate assertion. See [Authentication](/docs/authentication).

## Authorization Endpoints

### Evaluate Permission

```
POST /v1/evaluate
```

Check whether a subject has a permission on a resource. Supports batch evaluation, streaming (SSE), and trace mode.

**Request:**

```json
{
  "resource": "document:readme",
  "permission": "can_edit",
  "subject": "user:alice"
}
```

**Response:**

```json
{
  "allowed": true,
  "revision": "r_20260314a"
}
```

### Expand Relation

```
POST /v1/expand
```

Expand a relation to see all subjects that have it. Returns a userset tree. Supports streaming.

### List Resources

```
POST /v1/resources/list
```

Find all resources a subject can access with a given permission.

**Request:**

```json
{
  "subject": "user:alice",
  "permission": "can_view",
  "resource_type": "document"
}
```

### List Subjects

```
POST /v1/subjects/list
```

Find all subjects with a given permission on a resource.

### Simulate

```
POST /v1/simulate
```

What-if testing with ephemeral relationships — test permission changes without writing them.

### Watch

```
POST /v1/watch
```

Real-time Server-Sent Events (SSE) stream of relationship changes.

## Relationship Endpoints

### Write Relationships

```
POST /v1/relationships:write
```

**Request:**

```json
{
  "relationships": [
    {
      "resource": "document:readme",
      "relation": "editor",
      "subject": "user:alice"
    }
  ]
}
```

### List Relationships

```
POST /v1/relationships:list
```

Filter by resource, relation, and/or subject. Supports pagination.

### Get Relationship

```
GET /v1/relationships/:id
```

### Delete Relationship

```
DELETE /v1/relationships/:id
```

### Bulk Delete

```
POST /v1/relationships/delete
```

Delete relationships matching a filter.

## Account and Vault Endpoints

### Accounts

| Method   | Path               | Description    |
| -------- | ------------------ | -------------- |
| `POST`   | `/v1/accounts`     | Create account |
| `GET`    | `/v1/accounts`     | List accounts  |
| `GET`    | `/v1/accounts/:id` | Get account    |
| `PATCH`  | `/v1/accounts/:id` | Update account |
| `DELETE` | `/v1/accounts/:id` | Delete account |

### Vaults

| Method   | Path                              | Description                           |
| -------- | --------------------------------- | ------------------------------------- |
| `POST`   | `/v1/accounts/:account_id/vaults` | Create vault                          |
| `GET`    | `/v1/accounts/:account_id/vaults` | List vaults                           |
| `GET`    | `/v1/vaults/:id`                  | Get vault                             |
| `PATCH`  | `/v1/vaults/:id`                  | Update vault                          |
| `DELETE` | `/v1/vaults/:id`                  | Delete vault (cascades, irreversible) |

## Health Endpoints

No authentication required.

| Path                  | Description     |
| --------------------- | --------------- |
| `GET /health/live`    | Liveness probe  |
| `GET /health/ready`   | Readiness probe |
| `GET /health/startup` | Startup probe   |

## Metrics

```
GET /metrics
```

Prometheus-format metrics. See [Observability](/docs/observability).

## Content Negotiation

| Accept Header      | Format                                                                      |
| ------------------ | --------------------------------------------------------------------------- |
| `application/json` | JSON (default)                                                              |
| `text/toon`        | Token Oriented Object Notation (30-60% token reduction for LLM consumption) |

## Rate Limiting

Default limits (configurable per deployment):

- **1,000 requests/minute** per IP
- **10,000 requests/minute** per tenant

Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

## Error Responses

```json
{
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "Insufficient scope: requires inferadb.write"
  }
}
```

Standard HTTP status codes: 200, 400, 401, 403, 404, 429, 500.
