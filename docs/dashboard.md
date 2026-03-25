---
layout: docs
title: Dashboard — InferaDB
doc_title: Dashboard
doc_subtitle: A web-based management interface for InferaDB tenants, policies, and authorization data.
---

## Overview

The InferaDB Dashboard is a single-page application for managing authorization infrastructure. Edit IPL policies, explore relationships, simulate decisions, and review audit logs.

## Features

### Tenant Management

Manage the full Organization → Vault hierarchy:

- Create and configure organizations and vaults
- Manage team membership and user grants
- View vault-level metrics and health status

### IPL Policy Editor

A built-in code editor for writing and managing [IPL schemas](/docs/ipl):

- **Syntax highlighting** — IPL keywords, types, relations, and operators
- **Real-time validation** — See schema errors inline as you type, with line-level diagnostics
- **Push to Engine** — Deploy schema changes directly from the editor

### Decision Simulator

Test authorization checks interactively:

1. Select a vault and schema version
2. Enter a subject, relation, and resource
3. Run the check and inspect the result, evaluation trace, and timing

Debug unexpected ALLOW or DENY results — the trace shows exactly which relations were traversed.

### Relationship Graph Visualizer

Interactive graph view of authorization data. Entities render as nodes, relationships as directed edges.

- Explore permission connections across your entity hierarchy
- Identify unexpected paths between subjects and resources
- Filter by type, relation, or entity ID

### Audit Explorer

Browse and search the immutable audit trail. Entries include:

- Timestamp
- Decision result (ALLOW / DENY)
- Request parameters (subject, relation, resource)
- Policy version and revision token
- Cryptographic signature

Filter by time range, subject, resource, result, or vault.

## Configuration

Configure Engine and Control API endpoints via environment variables:

| Variable          | Default                 | Description                      |
| ----------------- | ----------------------- | -------------------------------- |
| `CONTROL_API_URL` | `http://localhost:8081` | Control plane API endpoint       |
| `ENGINE_API_URL`  | `http://localhost:8080` | Engine (data plane) API endpoint |

## Development

Start the development server:

```bash
cd dashboard
npm install
npm run dev
```

Runs at [http://localhost:5173](http://localhost:5173) with hot module replacement.

### Running Tests

```bash
npm run test        # Run unit tests via Vitest
npm run test:watch  # Watch mode
```

## Accessing the Dashboard

With `inferadb dev start`, the dashboard is at [http://localhost:3000](http://localhost:3000). For Kubernetes deployments:

```bash
kubectl port-forward svc/inferadb-dashboard 3000:3000
```
