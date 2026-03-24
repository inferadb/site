---
layout: docs
title: Authentication — InferaDB
doc_title: Authentication
doc_subtitle: How clients authenticate with the Engine and Control services.
---

## Engine Authentication

The Engine supports multiple authentication methods for authorization check requests. All methods produce a validated identity with a vault scope and permission set.

### Private-Key JWT (Ed25519)

The recommended method for service-to-service authentication. Clients generate a JWT signed with their Ed25519 private key and present it as a Bearer token. The Engine validates the signature against the client's registered public key.

This follows [RFC 7523](https://datatracker.ietf.org/doc/html/rfc7523) (JSON Web Token Profile for OAuth 2.0 Client Authentication).

```bash
curl -H "Authorization: Bearer <signed-jwt>" \
  https://engine.example.com/v1/check
```

### OAuth 2.0 Bearer Token

Standard OAuth 2.0 Bearer tokens issued by the Control service's `/v1/tokens` endpoint. The Engine validates these against the vault's JWKS.

### OIDC Auto-Discovery

The Engine can validate tokens from external OIDC providers by fetching the provider's `.well-known/openid-configuration` and corresponding JWKS. Configure the issuer URL in the Engine's config.

### Internal Service JWT

For internal service-to-service communication (e.g., Control → Engine), a shared internal JWT scheme is used with pre-configured signing keys.

## Required JWT Claims

All JWTs presented to the Engine must include the following claims:

| Claim     | Type   | Description                                   |
| --------- | ------ | --------------------------------------------- |
| `iss`     | string | Issuer identifier                             |
| `sub`     | string | Subject (client ID or user ID)                |
| `aud`     | string | Audience — must be `https://api.inferadb.com` |
| `exp`     | number | Expiration time (Unix timestamp)              |
| `iat`     | number | Issued-at time (Unix timestamp)               |
| `jti`     | string | Unique token ID (for replay protection)       |
| `scope`   | string | Space-separated list of granted scopes        |
| `vault`   | string | Vault ID this token is scoped to              |
| `account` | string | Account (organization) ID                     |

## Scope Mapping

JWT scopes map to Engine operations:

| Scope            | Permitted Operations                      |
| ---------------- | ----------------------------------------- |
| `inferadb.check` | Evaluate, Expand, List subjects/resources |
| `inferadb.write` | Write relationships, Delete relationships |

A token with `inferadb.check` can perform read operations (check, expand, list) but cannot modify relationship data. A token with `inferadb.write` can create and delete relationships.

## JWKS Caching

The Engine caches JWKS (JSON Web Key Sets) to avoid fetching keys on every request:

| Behavior                   | Detail                                                         |
| -------------------------- | -------------------------------------------------------------- |
| TTL                        | 5 minutes                                                      |
| Stale-while-revalidate     | Serves cached keys while refreshing in the background          |
| Thundering-herd protection | Only one refresh request is issued, even under concurrent load |
| Per-tenant isolation       | Each vault's JWKS is cached independently                      |

When the Engine encounters a JWT signed with an unknown key ID (`kid`), it triggers a JWKS refresh. The stale-while-revalidate pattern ensures that existing valid tokens continue to be accepted during the refresh.

## Control Authentication

The Control service supports multiple authentication methods for its REST API:

### Session Tokens

For browser and CLI sessions, the Control service issues **256-bit cryptographically random session tokens**. These are:

- Generated using a CSPRNG
- Stored server-side with associated user and session metadata
- Stored client-side in the **OS keychain** for CLI users, or as HTTP-only cookies for browser sessions
- Revocable individually or in bulk (e.g., "log out all sessions")

### WebAuthn Passkeys

The Control service supports WebAuthn/FIDO2 passkeys as a second factor or passwordless authentication method. Passkeys are vault-scoped and tied to a specific user account.

### PKCE CLI Flow

The CLI authenticates using the OAuth 2.0 Authorization Code flow with PKCE (Proof Key for Code Exchange):

1. CLI generates a code verifier and challenge
2. CLI opens the browser to the Control service's `/v1/auth/device` endpoint
3. User authenticates in the browser
4. Control service redirects back with an authorization code
5. CLI exchanges the code (with verifier) for a session token

This avoids storing passwords in CLI configuration files.

### Client Certificate Assertion

API clients can authenticate using Ed25519 client certificate assertions per [RFC 7523](https://datatracker.ietf.org/doc/html/rfc7523). The client signs an assertion JWT with its private key and presents it to the `/v1/tokens/assert` endpoint to receive a vault-scoped access token.

```
POST /v1/tokens/assert
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer
&assertion=<signed-jwt>
```
