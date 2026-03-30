---
layout: post
title: "Migrating from Home-Grown RBAC to InferaDB"
post_title: "Migrating from Home-Grown RBAC to InferaDB"
date: 2026-03-25
category: engineering
description: "A concrete guide to migrating from home-grown RBAC to InferaDB. Replace your homegrown authorization system with managed authorization infrastructure — step by step, with dual-write, shadow mode, and rollback."
hero: /assets/images/dispatch/migrating-rbac.svg
authors:
  - Evan Sims
---

You know the pattern. Every team ends up here.

It started with a `user_roles` table and a handful of `if` statements. Then someone needed granular permissions, so you added a `permissions` table and a join through `role_permissions`. Then teams needed their own access boundaries, so `team_memberships` appeared. Then a customer asked for document sharing, so you built a `shares` table with polymorphic associations. Then someone needed to override a team-level permission for a single resource, so you added `resource_overrides` with a priority column.

Now you have five or six tables, a few hundred lines of authorization logic scattered across middleware and service layers, and **nobody on the team can confidently answer the question: "Who has access to what?"**

If this sounds familiar, this guide is for you. We've helped teams migrate from exactly this kind of system to InferaDB Cloud — a managed authorization service where you integrate via API and we handle infrastructure, scaling, and audit trails. The migration is more straightforward than you'd expect. Here's the concrete path.

## Step 1: Audit Your Current Model

Before you write any migration code, you need a clear picture of what you actually have. Most home-grown RBAC systems, regardless of how complex they feel, break down into a small number of entity types and relationships.

Start by listing every table or data structure involved in authorization decisions. For most teams, this is **3-5 entity types** (users, teams, organizations, resources, roles) and **5-15 relationship types** (member_of, owner_of, can_view, can_edit, admin_of, shared_with).

Map them out. A spreadsheet works. You're looking for:

- **Entity types**: What are the nouns? Users, teams, organizations, documents, projects, folders.
- **Relationship types**: What are the verbs? Owns, belongs to, can view, can edit, administers.
- **Inheritance paths**: Does team membership grant access to team resources? Does org admin imply team admin? Trace every path through which access is derived.
- **Overrides and exceptions**: Where does your code break the normal inheritance? Resource-level sharing, temporary grants, explicit denials.

Write it all down. You will probably find that the actual model is simpler than the code that implements it. The complexity in home-grown systems tends to live in the implementation, not the model itself.

## Step 2: Model It in IPL

Once you have your audit, translating it to InferaDB's schema language is mechanical. IPL (the Infera Policy Language) maps directly to the entity-relationship model you just documented.

Here's how a typical home-grown RBAC system looks in IPL. Say you have users, teams, and documents. Users belong to teams, teams own documents, and users can be directly shared on documents:

```
type team {
    relation member: user
    relation admin: user

    relation can_manage = admin
    relation can_view = member | admin
}

type document {
    relation parent: team
    relation owner: user
    relation editor: user
    relation viewer: user

    relation can_edit = owner | editor | admin from parent
    relation can_view = can_edit | viewer | member from parent
}
```

That's it. The `admin from parent` expression means "anyone who is an admin of the document's parent team" — a computed relationship that replaces the multi-join query you're running today. The union operator (`|`) replaces the `OR` chains in your middleware.

A few things to notice:

- **Your role hierarchy becomes explicit.** Instead of a `roles` table with an implicit ordering, each permission spells out exactly which relationships grant it.
- **Resource-level sharing is native.** The `editor: user` and `viewer: user` relations on `document` handle direct sharing without a separate `shares` table.
- **Inheritance is declarative.** `member from parent` traverses the team relationship automatically. No application code required.

If your model includes deeper hierarchies — organizations containing teams containing projects containing documents — IPL handles arbitrarily deep relationship chains. You're not going to hit a complexity ceiling.

## Step 3: Dual-Write

This is where the migration gets real, but the risk stays low.

The dual-write phase means: every time your application writes an authorization change (adding a user to a team, sharing a document, changing a role), you write it to **both** your existing system and InferaDB. You continue reading from your existing system for all authorization decisions.

```
// Pseudocode — your write path
async function addTeamMember(userId, teamId) {
    // Existing system (still authoritative)
    await db.insert('team_memberships', { userId, teamId });

    // InferaDB (building state)
    await inferadb.write({
        entity: `team:${teamId}`,
        relation: 'member',
        subject: `user:${userId}`,
    });
}
```

The dual-write adds negligible latency. InferaDB writes complete in under a millisecond, and you can fire them asynchronously if you prefer — the existing system is still the source of truth during this phase.

Run the dual-write for long enough to build confidence that InferaDB's state matches your existing system. Write a reconciliation script that compares the two. For most teams, a week of dual-write with daily reconciliation is sufficient.

**What about existing data?** Before you start dual-writing, you need a backfill. Write a migration script that reads your current authorization tables and writes the equivalent relationships to InferaDB. Run reconciliation against the full dataset. This is usually a few hundred lines of code and an afternoon of work.

## Step 4: Shadow Mode

Now the interesting part. Shadow mode means you route authorization checks to **both** systems and compare the results, but you only enforce the decision from your existing system.

```
async function checkAccess(userId, resource, permission) {
    // Existing system (still enforced)
    const existingResult = await legacyAuthCheck(userId, resource, permission);

    // InferaDB (shadow — logged, not enforced)
    const inferaResult = await inferadb.check({
        entity: `document:${resource}`,
        relation: permission,
        subject: `user:${userId}`,
    });

    if (existingResult !== inferaResult) {
        logger.alert('Authorization divergence', {
            userId, resource, permission,
            existing: existingResult,
            infera: inferaResult,
        });
    }

    return existingResult; // Existing system still decides
}
```

Shadow mode is your safety net. It catches every category of migration bug:

- **Model translation errors** — a relationship you mapped incorrectly in IPL
- **Backfill gaps** — relationships that existed in your old system but weren't migrated
- **Timing issues** — dual-writes that arrive out of order

Alert on every divergence. Investigate each one. In practice, the first day of shadow mode surfaces most issues — typically a handful of edge cases in your model translation. By the end of the first week, divergences should be zero or near-zero.

**How long should you run shadow mode?** Until you have zero unexplained divergences for at least a full business cycle. For most teams, that's one to two weeks. If your application has monthly workflows (billing cycles, quarterly reviews), consider running shadow mode through one full cycle.

## Step 5: Cutover

When shadow mode has been clean for your target period, switch enforcement to InferaDB. This is a flag flip, not a deployment:

```
const USE_INFERADB = config.get('authorization.provider'); // 'infera' or 'legacy'

async function checkAccess(userId, resource, permission) {
    if (USE_INFERADB === 'infera') {
        return inferadb.check({
            entity: `document:${resource}`,
            relation: permission,
            subject: `user:${userId}`,
        });
    }
    return legacyAuthCheck(userId, resource, permission);
}
```

Keep your old system running in read-only mode for one release cycle. If anything surfaces post-cutover, you can flip back to the legacy path in seconds. You're not tearing out the old system yet — you're just changing which system makes the decision.

During this phase, you can stop dual-writing. InferaDB is now the source of truth for authorization state. Your old tables become a historical reference.

## Step 6: Cleanup

This is the satisfying part.

Once you've run on InferaDB through a full release cycle with no issues:

- **Delete the authorization tables.** `user_roles`, `role_permissions`, `team_memberships`, `shares`, `resource_overrides` — all of it.
- **Remove the authorization middleware.** Those hundred-plus lines of join queries, role-checking functions, and permission-caching logic.
- **Remove the caching layer.** If you were caching permission results in Redis or in-memory (and you probably were), that infrastructure is no longer needed. InferaDB's 2.8 microsecond p99 reads are faster than most cache lookups.
- **Update your tests.** Replace the authorization test fixtures that set up complex role hierarchies with simple relationship writes to InferaDB.

For most teams, this removes several hundred to several thousand lines of code, one to three database tables, and a meaningful amount of operational complexity.

## Addressing Common Concerns

**"Our model is too complex for this."** We hear this from almost every team, and it hasn't been true yet. The home-grown systems that feel the most complex are usually the ones with the simplest underlying models buried under layers of implementation complexity. IPL handles arbitrary relationship depth, computed permissions, explicit denials, and WASM-based custom logic for truly unusual requirements. Your model will fit.

**"What about performance during migration?"** The dual-write phase adds under 1ms of write latency. Shadow mode adds one additional read per authorization check, but InferaDB's read latency (2.8 microseconds p99) means the shadow check completes before most network round-trips. Your users will not notice.

**"What if we need to roll back?"** That's what shadow mode is for. You validate the migration under production traffic before it matters. If you find issues post-cutover, the flag flip takes seconds. Your old system is still running, still has the data, and still works. The migration is fully reversible until you reach the cleanup phase.

**"We have millions of relationships."** InferaDB's storage engine was built for this scale. The backfill is a batch write operation. We've seen teams migrate tens of millions of relationships in under an hour. Write throughput is not the bottleneck — your migration script's database read speed is.

## What You Get on the Other Side

After the migration, your authorization system is:

- **Queryable.** "Who has access to this document?" is a single API call, not a six-table join with application logic.
- **Auditable.** Every relationship change is recorded in a tamper-evident log. Compliance teams can trace access decisions without parsing application logs.
- **Fast.** Sub-3-microsecond permission checks, with no caching layer to invalidate or tune.
- **Consistent.** Linearizable writes mean revoked access is revoked everywhere, immediately. No stale replicas, no cache windows.
- **Maintainable.** Your authorization model is declared in a schema file, not scattered across middleware, migrations, and application code.

The migration typically takes two to four weeks from first audit to cleanup, depending on how long you run shadow mode. The hardest part is the audit. Everything after that is mechanical.

## Get Started

Ready to map your current system to InferaDB? Start here:

- **[Quickstart Guide](/docs/quickstart)** — Get InferaDB running and model your first schema in under ten minutes
- **[IPL Reference](/docs/ipl)** — Full documentation for the Infera Policy Language
- **[Join the waitlist](/waitlist)** for InferaDB Cloud — managed authorization infrastructure, no deployment required
