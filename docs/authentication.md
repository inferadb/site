---
layout: docs
title: Authentication
doc_title: Authentication
doc_subtitle: How clients authenticate with the Engine and Control services.
---

## Engine Authentication

All methods produce a validated identity with a vault scope and permission set.

### Private-Key JWT (Ed25519)

Recommended for service-to-service auth. Sign a JWT with your Ed25519 private key; the Engine validates against your registered public key per [RFC 7523](https://datatracker.ietf.org/doc/html/rfc7523).

```bash
curl -H "Authorization: Bearer <signed-jwt>" \
  https://engine.example.com/v1/check
```

### OAuth 2.0 Bearer Token

Bearer tokens issued by the Control service's `/v1/tokens` endpoint. Validated against the vault's JWKS.

### OIDC Auto-Discovery

Validates tokens from external OIDC providers via `.well-known/openid-configuration` discovery. Configure the issuer URL in the Engine config.

### Internal Service JWT

For internal communication (e.g., Control to Engine) using pre-configured signing keys.

## Required JWT Claims

All JWTs presented to the Engine must include:

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

## JWKS Caching

JWKS caching behavior:

| Behavior                   | Detail                                                         |
| -------------------------- | -------------------------------------------------------------- |
| TTL                        | 5 minutes                                                      |
| Stale-while-revalidate     | Serves cached keys while refreshing in the background          |
| Thundering-herd protection | Only one refresh request is issued, even under concurrent load |
| Per-tenant isolation       | Each vault's JWKS is cached independently                      |

An unknown `kid` triggers a JWKS refresh. Stale-while-revalidate ensures existing tokens remain valid during the refresh.

## Control Authentication

The Control service REST API supports:

### Session Tokens

256-bit CSPRNG tokens for browser and CLI sessions.

- Stored server-side with user and session metadata
- Client-side: OS keychain (CLI) or HTTP-only cookies (browser)
- Revocable individually or in bulk

### WebAuthn Passkeys

WebAuthn/FIDO2 passkeys as a second factor or passwordless method. Vault-scoped and tied to a user account.

### PKCE CLI Flow

Authorization Code flow with PKCE:

1. CLI generates a code verifier and challenge
2. Opens browser to `/v1/auth/device`
3. User authenticates; Control redirects with an authorization code
4. CLI exchanges the code (with verifier) for a session token

### Client Certificate Assertion

Ed25519 client certificate assertions per [RFC 7523](https://datatracker.ietf.org/doc/html/rfc7523). Present a signed assertion JWT to `/v1/tokens/assert` to receive a vault-scoped access token.

```
POST /v1/tokens/assert
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer
&assertion=<signed-jwt>
```
