---
layout: docs
title: Control Architecture — InferaDB
doc_title: Control Architecture
doc_subtitle: Deep dive into InferaDB's control plane — tenant management, authentication, and administration.
---

## Overview

The Control service is InferaDB's **control plane**. It exposes a REST API at `/v1/` for managing organizations, vaults, users, clients, tokens, and audit logs. It handles all administrative operations and issues the credentials that clients use to authenticate with the Engine.

## API Endpoints

### Authentication

| Method | Endpoint                  | Description                     |
| ------ | ------------------------- | ------------------------------- |
| POST   | `/v1/auth/register`       | Create a new user account       |
| POST   | `/v1/auth/login`          | Authenticate and receive tokens |
| POST   | `/v1/auth/logout`         | Invalidate the current session  |
| POST   | `/v1/auth/verify-email`   | Confirm email address           |
| POST   | `/v1/auth/password-reset` | Initiate password reset flow    |
| POST   | `/v1/auth/device`         | PKCE-based CLI authentication   |

### Users

| Method | Endpoint                  | Description              |
| ------ | ------------------------- | ------------------------ |
| GET    | `/v1/users/me`            | Get current user profile |
| PATCH  | `/v1/users/me`            | Update profile           |
| GET    | `/v1/users/me/emails`     | List email addresses     |
| POST   | `/v1/users/me/emails`     | Add email address        |
| DELETE | `/v1/users/me/emails/:id` | Remove email address     |

### Organizations

| Method | Endpoint                            | Description                   |
| ------ | ----------------------------------- | ----------------------------- |
| POST   | `/v1/organizations`                 | Create organization           |
| GET    | `/v1/organizations/:id`             | Get organization details      |
| PATCH  | `/v1/organizations/:id`             | Update organization           |
| DELETE | `/v1/organizations/:id`             | Delete organization           |
| POST   | `/v1/organizations/:id/transfer`    | Transfer ownership            |
| POST   | `/v1/organizations/:id/suspend`     | Suspend organization          |
| POST   | `/v1/organizations/:id/resume`      | Resume suspended organization |
| GET    | `/v1/organizations/:id/members`     | List members                  |
| POST   | `/v1/organizations/:id/invitations` | Send invitation               |

### Vaults

| Method | Endpoint                     | Description       |
| ------ | ---------------------------- | ----------------- |
| POST   | `/v1/vaults`                 | Create vault      |
| GET    | `/v1/vaults/:id`             | Get vault details |
| PATCH  | `/v1/vaults/:id`             | Update vault      |
| DELETE | `/v1/vaults/:id`             | Delete vault      |
| GET    | `/v1/vaults/:id/user-grants` | List user grants  |
| POST   | `/v1/vaults/:id/user-grants` | Create user grant |
| GET    | `/v1/vaults/:id/team-grants` | List team grants  |
| POST   | `/v1/vaults/:id/team-grants` | Create team grant |

### Clients

| Method | Endpoint                       | Description                |
| ------ | ------------------------------ | -------------------------- |
| POST   | `/v1/clients`                  | Create API client          |
| GET    | `/v1/clients/:id`              | Get client details         |
| PATCH  | `/v1/clients/:id`              | Update client              |
| DELETE | `/v1/clients/:id`              | Delete client              |
| POST   | `/v1/clients/:id/deactivate`   | Deactivate client          |
| POST   | `/v1/clients/:id/certificates` | Upload Ed25519 certificate |

### Tokens

| Method | Endpoint             | Description                 |
| ------ | -------------------- | --------------------------- |
| POST   | `/v1/tokens`         | Issue vault-scoped JWT      |
| POST   | `/v1/tokens/refresh` | Refresh with rotation       |
| POST   | `/v1/tokens/assert`  | Client assertion (RFC 7523) |

### Other

| Resource   | Endpoints                 |
| ---------- | ------------------------- |
| Teams      | CRUD at `/v1/teams`       |
| Audit Logs | Query at `/v1/audit-logs` |
| Sessions   | Manage at `/v1/sessions`  |

## Authentication Architecture

### Two-Token Design

The Control service uses a two-token architecture:

1. **Session tokens** — 256-bit cryptographically random tokens used for browser and CLI sessions. Stored in the OS keychain for CLI users.
2. **Vault-scoped JWTs** — Ed25519-signed JWTs scoped to a specific vault. Used by API clients to authenticate with the Engine.

### Refresh Token Rotation

When a client refreshes a token, the old refresh token is immediately invalidated and a new one is issued. If a previously-used refresh token is presented (replay), all tokens in the family are revoked — this detects token theft.

### Password Hashing

Passwords are hashed with **Argon2id** using the following parameters:

| Parameter   | Value   |
| ----------- | ------- |
| Memory      | 64 MB   |
| Iterations  | 3       |
| Parallelism | Default |

## Entity IDs

All entities (users, organizations, vaults, clients) use **Twitter Snowflake** IDs — 64-bit integers that encode a timestamp, machine ID, and sequence number. Snowflake IDs are globally unique, roughly time-ordered, and fit in a single 64-bit integer.

## Organization Tiers

| Tier       | Vault Limit |
| ---------- | ----------- |
| DEV        | 5           |
| PRO        | 50          |
| Enterprise | Unlimited   |

## Rate Limits

| Operation    | Limit      |
| ------------ | ---------- |
| Login        | 100 / hour |
| Registration | 5 / day    |

Rate limits are applied per-IP and are designed to prevent brute-force attacks without impacting normal usage.
