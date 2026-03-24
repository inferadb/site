---
layout: docs
title: PHP SDK — InferaDB
doc_title: PHP SDK
doc_subtitle: PHP client for InferaDB with Laravel and Symfony integration.
---

> **Coming soon.** The PHP SDK is under active development. The API surface shown here is based on the [Rust SDK](/docs/sdk-rust) and may change before release.

The official PHP SDK (`inferadb/inferadb-php`) provides a typed client for InferaDB's authorization APIs. Requires PHP 8.2+ and works with Laravel, Symfony, and any PSR-18 HTTP client.

## Installation

```bash
composer require inferadb/inferadb-php
```

## Authentication

Three authentication methods:

| Method                           | Use Case                     | Security |
| -------------------------------- | ---------------------------- | -------- |
| Client Credentials (Ed25519 JWT) | Service-to-service           | High     |
| Bearer Token                     | User sessions, OAuth         | Medium   |
| API Key                          | Testing, simple integrations | Basic    |

### Client Credentials (Recommended)

```php
use InferaDB\InferaDB;
use InferaDB\Auth\Ed25519PrivateKey;
use InferaDB\Auth\ClientCredentials;

$client = InferaDB::builder()
    ->url('https://engine.inferadb.com')
    ->credentials(new ClientCredentials(
        clientId: 'my-client',
        privateKey: Ed25519PrivateKey::fromPemFile('client.pem'),
        certificateId: 'cert-id',
    ))
    ->build();
```

### Bearer Token

```php
$client = InferaDB::builder()
    ->url('https://engine.inferadb.com')
    ->bearerToken(getenv('INFERADB_TOKEN'))
    ->build();
```

### API Key

```php
$client = InferaDB::builder()
    ->url('https://engine.inferadb.com')
    ->apiKey(getenv('INFERADB_API_KEY'))
    ->build();
```

## Permission Checks

```php
$vault = $client->organization('my-org')->vault('production');

// Simple check
$allowed = $vault->check('user:alice', 'can_edit', 'document:readme');
```

### With ABAC Context

```php
$allowed = $vault->check('user:alice', 'can_view', 'document:readme', [
    'context' => ['ip_address' => '10.0.0.1'],
]);
```

### Require — Throws on Deny

```php
use InferaDB\Exceptions\AccessDeniedException;

// Throws AccessDeniedException if permission is denied
$vault->require('user:alice', 'can_edit', 'document:readme');
```

### With Consistency Token

```php
$allowed = $vault->check('user:alice', 'can_view', 'document:readme', [
    'atLeastAsFresh' => $revisionToken,
]);
```

### Batch Check

```php
use InferaDB\CheckRequest;

$results = $vault->checkBatch([
    new CheckRequest('user:alice', 'can_edit', 'document:readme'),
    new CheckRequest('user:bob', 'can_view', 'document:readme'),
]);

if ($results->allAllowed()) {
    // all checks passed
}
```

## Relationships

### Write

```php
use InferaDB\Relationship;

// Returns a revision token
$token = $vault->relationships()->write(
    new Relationship('document:readme', 'editor', 'user:alice')
);
```

### Batch Write

```php
$vault->relationships()->writeBatch([
    new Relationship('document:readme', 'editor', 'user:alice'),
    new Relationship('document:readme', 'viewer', 'user:bob'),
]);
```

### List

```php
$rels = $vault->relationships()
    ->list()
    ->resource('document:readme')
    ->collect();
```

### Delete

```php
$vault->relationships()
    ->deleteWhere()
    ->resource('document:readme')
    ->relation('viewer')
    ->subject('user:bob')
    ->execute();
```

## Lookups

```php
// What resources can Alice view?
$resources = $vault->resources()
    ->accessibleBy('user:alice')
    ->withPermission('can_view')
    ->resourceType('document')
    ->collect();

// Who can edit this document?
$subjects = $vault->subjects()
    ->withPermission('can_edit')
    ->onResource('document:readme')
    ->collect();
```

## Testing

Three approaches with different trade-offs:

### MockClient (Fastest)

```php
use InferaDB\Testing\MockClient;

$client = MockClient::builder()
    ->onCheck('user:alice', 'can_edit', 'document:readme')->allow()
    ->onCheck('user:bob', 'can_edit', 'document:readme')->deny()
    ->onCheckAnySubject('can_view', 'document:readme')->allow()
    ->defaultDeny()
    ->verifyOnDestruct(true)
    ->build();
```

Setting `verifyOnDestruct(true)` asserts that all registered expectations were invoked when the client is destroyed — preventing silent untested assumptions.

### InMemoryClient (Full Policy Evaluation)

```php
use InferaDB\Testing\InMemoryClient;

$client = InMemoryClient::withSchemaAndData(
    schema: <<<'IPL'
    type document {
        relation viewer
        relation editor
        relation can_view = viewer | editor
    }
    IPL,
    data: [
        new Relationship('document:readme', 'editor', 'user:alice'),
        new Relationship('document:readme', 'viewer', 'user:bob'),
    ],
);
```

### TestVault (Real Instance)

```php
use InferaDB\Testing\TestVault;

$vault = TestVault::create($org, schema: $schemaIpl);
// vault auto-cleans up on __destruct
// call $vault->preserve() to keep data for debugging
```

### PHPUnit Integration

```php
use PHPUnit\Framework\TestCase;
use InferaDB\Testing\InMemoryClient;

class DocumentAuthorizationTest extends TestCase
{
    private InMemoryClient $client;

    protected function setUp(): void
    {
        $this->client = InMemoryClient::withSchemaAndData(
            schema: '...',
            data: [new Relationship('document:readme', 'editor', 'user:alice')],
        );
    }

    public function testAliceCanEdit(): void
    {
        $vault = $this->client->organization('test')->vault('test');
        $this->assertTrue($vault->check('user:alice', 'can_edit', 'document:readme'));
    }
}
```

## Error Handling

```php
use InferaDB\Exceptions\AccessDeniedException;
use InferaDB\Exceptions\InferaDBException;

try {
    $vault->require('user:alice', 'can_edit', 'document:readme');
} catch (AccessDeniedException $e) {
    // permission denied
} catch (InferaDBException $e) {
    if ($e->isRetriable()) {
        // retry after $e->getRetryAfter() seconds
    }
    error_log(sprintf('Authorization error: kind=%s, requestId=%s',
        $e->getKind()->value, $e->getRequestId()));
}
```

`ErrorKind` enum: `Unauthorized`, `Forbidden`, `NotFound`, `RateLimited`, `SchemaViolation`, `Unavailable`, `Timeout`, `InvalidArgument`.

## Framework Integrations

### Laravel Middleware

```php
// app/Http/Middleware/InferaDBAuthorize.php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use InferaDB\VaultClient;
use InferaDB\Exceptions\AccessDeniedException;

class InferaDBAuthorize
{
    public function __construct(private VaultClient $vault) {}

    public function handle(Request $request, Closure $next, string $permission): mixed
    {
        $userId = $request->user()->id;
        $documentId = $request->route('document');

        try {
            $this->vault->require(
                "user:{$userId}",
                $permission,
                "document:{$documentId}",
            );
        } catch (AccessDeniedException) {
            abort(403);
        }

        return $next($request);
    }
}
```

Register in routes:

```php
Route::get('/documents/{document}', [DocumentController::class, 'show'])
    ->middleware('inferadb:can_view');

Route::put('/documents/{document}', [DocumentController::class, 'update'])
    ->middleware('inferadb:can_edit');
```

### Laravel Gate Integration

```php
// app/Providers/AuthServiceProvider.php
use Illuminate\Support\Facades\Gate;
use InferaDB\VaultClient;

Gate::define('view-document', function ($user, $document) {
    return app(VaultClient::class)->check(
        "user:{$user->id}",
        'can_view',
        "document:{$document->id}",
    );
});
```

### Symfony Voter

```php
// src/Security/InferaDBVoter.php
namespace App\Security;

use InferaDB\VaultClient;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

class InferaDBVoter extends Voter
{
    public function __construct(private VaultClient $vault) {}

    protected function supports(string $attribute, mixed $subject): bool
    {
        return str_starts_with($attribute, 'INFERADB_');
    }

    protected function voteOnAttribute(
        string $attribute,
        mixed $subject,
        TokenInterface $token,
    ): bool {
        $user = $token->getUser();
        $permission = strtolower(str_replace('INFERADB_', '', $attribute));

        return $this->vault->check(
            "user:{$user->getUserIdentifier()}",
            $permission,
            "document:{$subject->getId()}",
        );
    }
}
```
