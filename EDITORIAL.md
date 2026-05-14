# Editorial — Dispatch (and other long-form)

## Why this exists

InferaDB's positioning depends on visible engineering credibility. Senior
engineers and CISOs evaluate early-stage infrastructure partly by how the
team writes about its own work. TigerBeetle's blog is a useful comparison —
matklad, Joran, and a handful of named engineers carry the voice. Posts read
as senior-engineer-to-senior-engineer prose, not brand storytelling.

This file documents the cadence and voice so we can keep it consistent.

## Cadence

| Type                    | Frequency     | Length          | Author                          |
| ----------------------- | ------------- | --------------- | ------------------------------- |
| Engineering deep-dive   | 1–2 / month   | 1500–4000 words | Founder or named engineer       |
| Architecture explainer  | 1 / month     | 800–1500 words  | Founder                         |
| Customer story          | as available  | 600–1000 words  | Founder + customer co-byline    |
| Release notes / Dispatch| as shipped    | 300–800 words   | Founder or named engineer       |
| News / commentary       | as warranted  | 400–1000 words  | Founder                         |

## Voice rules

- Write peer-to-peer, not vendor-to-prospect. Assume the reader is a senior
  engineer or platform lead.
- Lead with the technical claim. Save the marketing wrapper for the closing
  paragraph (or omit it).
- Cite sources for non-obvious technical claims — papers, RFCs, prior
  systems. The reader should be able to follow the trail.
- Avoid hedging. If a thing is true, say it. If a thing is opinion, label it.
- Show working code or real artifacts where it strengthens the argument.
  Don't invent benchmark numbers.

## Front matter requirements

Every Dispatch post must include:

```yaml
---
layout: post
post_title: "<post title>"
date: YYYY-MM-DD
category: engineering | news | ai | security | company
authors:
  - Evan Sims
description: "<one-sentence summary, used by SEO and social sharing>"
---
```

`authors` is an array of full names that match the `name` field of records in
`_data/team.yml`. The `post.html` layout iterates the array, looks up each
name in `team.yml`, and renders a byline chip in the header (with avatar +
link to the author card) plus a full author card in the post footer. If a
name doesn't match a team record, it falls back to plain text. Co-bylines are
supported by listing multiple names.

For hero/teaser image production (the social-card image referenced by `hero:`
in front matter), see `DISPATCH_TEASERS.md`.

## Standing post ideas (founder backlog)

- "What we learned building OpenFGA" — origin, lessons, what we'd do differently
- "Why we left to build the database underneath" — the gap OpenFGA can't close and why a new storage layer was the only honest answer
- "Authorization in the agentic era" — the 30-checks-per-action problem and what it does to latency budgets
- "Why we picked Rust for an authorization database"
- "Cryptographic audit explained for compliance teams"
- "Reading list for authorization" — Zanzibar, Spanner, VSR, Raft, Gray's transaction processing, etc.
