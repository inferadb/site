# InferaDB Design System

This document defines the visual language, layout patterns, and component conventions for the InferaDB marketing site. It serves as the source of truth for design decisions and should be consulted before creating new pages or modifying existing ones.

For build instructions, site architecture, and accessibility standards, see [CLAUDE.md](CLAUDE.md).

---

## Philosophy

### Typography-Driven Design

Typography does the work. The visual hierarchy is established through type scale, weight, contrast, and spacing — not through decorative elements, cards, or badges. Every section should feel confident with nothing but text and whitespace. Visuals (code windows, diagrams) are supporting evidence, not decoration.

### Restraint as a Feature

If a section works without an icon, don't add one. If a heading communicates the value, the description should add detail, not restate it. If whitespace creates emphasis, don't fill it. The design earns trust through clarity and confidence, not density.

### Content as Proof

The product's own artifacts — schema definitions, audit trail JSON, API responses — are the primary visuals. Code windows replace product screenshots (the product is pre-GA). These aren't decorative; they demonstrate what the product actually does.

---

## Layout Principles

### Generous Vertical Rhythm

Sections use 8–10rem of vertical padding. This creates a page that breathes — each section feels like its own viewport rather than a dense stack. On mobile (≤768px), sections use 5rem.

| Section type | Desktop padding | Mobile padding |
| ------------ | --------------- | -------------- |
| Statement    | 8rem            | 5rem           |
| Feature      | 8rem            | 5rem           |
| Use Cases    | 8rem            | 5rem           |
| CTA          | 10rem           | 10rem          |
| Hero         | Full viewport   | Full viewport  |

### Section Separators

Major sections are separated by a `1px solid var(--border)` top border. This creates clean visual breaks without consuming vertical space. Consecutive feature sections omit the border between them (they share a visual group).

### Asymmetric Split Layout

Feature sections use a two-column grid with heading on the left and description on the right. This creates editorial confidence and avoids the centered-header-over-card-grid pattern that dominates SaaS marketing. Below the split, a full-width visual (code window) provides proof.

```
┌─────────────────────────────────────────────────┐
│  Heading (large,      │  Description (smaller,  │
│  --text-white)        │  --text-secondary)      │
│                       │  with inline link →      │
├─────────────────────────────────────────────────┤
│  Full-width code window / visual                │
│                                                 │
└─────────────────────────────────────────────────┘
```

On mobile (≤768px), the split stacks to a single column.

### Statement Blocks

High-impact claims use a centered typographic block at a larger font size (`clamp(1.25rem, 2.5vw, 1.5rem)`). The first sentence is bold (`--text-white`), the rest is regular (`--text`). No heading, no cards — just a single paragraph that commands attention through size and contrast.

### Minimal CTA

The closing CTA is stripped to its essentials: a large heading (functioning as a second hero) and two buttons. No eyebrow, no glow, no description paragraph. The heading uses display type at `clamp(2rem, 5vw, 3.5rem)` — the largest on the page after the hero.

---

## Color System

### Backgrounds

| Token             | Value     | Usage                                                         |
| ----------------- | --------- | ------------------------------------------------------------- |
| `--bg`            | `#0b0d11` | Page background — blue-tinted dark slate, never neutral black |
| `--bg-raised`     | `#111520` | Raised surfaces (code windows, nav dropdowns)                 |
| `--bg-card`       | `#111520` | Card backgrounds                                              |
| `--bg-card-hover` | `#161b26` | Card hover state                                              |

### Text Hierarchy

Four contrast levels create typographic hierarchy without size changes:

| Token              | Value     | Contrast vs bg | Usage                                 |
| ------------------ | --------- | -------------- | ------------------------------------- |
| `--text-white`     | `#dce1e8` | 14.8:1         | Headings, emphasized text, `<strong>` |
| `--text-bright`    | `#c0c8d2` | 11.5:1         | Bright callouts, hero proof           |
| `--text`           | `#7d8590` | 5.21:1         | Body text, primary prose              |
| `--text-secondary` | `#778189` | 4.89:1         | Supporting descriptions, subtitles    |

All text tokens meet WCAG 2.1 AA (4.5:1 minimum). `--muted` (#555d68, ~2.9:1) exists for decorative elements only — never for readable text.

### Accent Colors

| Token            | Value (OKLCH)          | Usage                                                  |
| ---------------- | ---------------------- | ------------------------------------------------------ |
| `--accent`       | `oklch(0.73 0.12 80)`  | Primary — hazard amber. Links, buttons, keywords       |
| `--accent-teal`  | `oklch(0.72 0.1 200)`  | Secondary — desaturated teal. Types, info              |
| `--accent-red`   | `oklch(0.62 0.18 25)`  | Signal red — errors, denied states                     |
| `--accent-green` | `oklch(0.62 0.14 140)` | Muted green — success, allowed states, string literals |

### Borders

| Token                  | Value                       | Usage                                                |
| ---------------------- | --------------------------- | ---------------------------------------------------- |
| `--border`             | `rgba(200, 210, 230, 0.07)` | Section separators, panel edges — nearly invisible   |
| `--border-hover`       | `rgba(200, 210, 230, 0.12)` | Hover state borders                                  |
| `--border-interactive` | `#3a4250`                   | Interactive elements — opaque, 3:1 contrast for a11y |

---

## Typography

### Font Stack

| Token            | Family                   | Usage                                 |
| ---------------- | ------------------------ | ------------------------------------- |
| `--font-display` | Figtree (400–800)        | Display headings, section titles      |
| `--font-sans`    | Inter (400–600)          | Body text, UI elements                |
| `--font-mono`    | JetBrains Mono (400–500) | Code, technical labels, data readouts |

All fonts are self-hosted with optimized unicode ranges. Figtree uses `font-display: optional` (headings only, no reflow). Inter and JetBrains Mono use `font-display: swap`.

### Type Scale

| Element           | Size                            | Weight                   | Letter-spacing | Line-height |
| ----------------- | ------------------------------- | ------------------------ | -------------- | ----------- |
| Hero title        | `clamp(2.5rem, 6vw, 3.75rem)`   | 700                      | -0.04em        | 1.1         |
| CTA heading       | `clamp(2rem, 5vw, 3.5rem)`      | 600                      | -0.03em        | 1.15        |
| Feature heading   | `clamp(2rem, 4vw, 3rem)`        | 600                      | -0.035em       | 1.15        |
| Use cases heading | `clamp(1.75rem, 3.5vw, 2.5rem)` | 600                      | -0.03em        | —           |
| Statement text    | `clamp(1.25rem, 2.5vw, 1.5rem)` | 400 (600 for `<strong>`) | —              | 1.7         |
| Hero subtitle     | `1.0625rem`                     | 400                      | —              | 1.75        |
| Body text         | `1rem` / `0.9375rem`            | 400                      | —              | 1.7–1.8     |
| Tech labels       | `0.6875rem`                     | 500                      | 0.06em         | —           |
| Code              | `0.8125rem`                     | 400                      | —              | 1.7         |

### Text Wrapping

- Headings: `text-wrap: balance`
- Paragraphs: `text-wrap: pretty`
- Statement text: `text-wrap: balance`

---

## Spacing & Layout

### Container

| Token                | Value  | Usage                  |
| -------------------- | ------ | ---------------------- |
| `--container`        | 1060px | Standard content width |
| `--container-narrow` | 760px  | Prose-heavy pages      |

### Border Radius

| Token         | Value | Note                                        |
| ------------- | ----- | ------------------------------------------- |
| `--radius`    | 3px   | Angular, not rounded — industrial aesthetic |
| `--radius-sm` | 2px   | Smaller elements                            |

Never exceed 3px. The design is angular, not consumer-friendly rounded.

### Grid Gaps

| Context                 | Gap     |
| ----------------------- | ------- |
| Feature split           | 3rem    |
| Use cases grid          | 2rem    |
| Button groups           | 0.75rem |
| Code window dot spacing | 0.5rem  |

---

## Motion

### Easing

All transitions use `var(--ease-mechanical)` — a custom `linear()` easing function that simulates a hydraulic actuator. It overshoots slightly (peaks at 1.017) then settles. This is deliberate: it feels mechanical and precise, not rubbery or playful.

### Durations

| Element           | Duration                     |
| ----------------- | ---------------------------- |
| Buttons           | 0.25s                        |
| Tabs              | 0.15s                        |
| Code window hover | 0.25s                        |
| Hero glow         | 0.6s                         |
| Scroll reveals    | CSS-driven via `data-reveal` |

### Reduced Motion

`@media (prefers-reduced-motion: reduce)` disables all transitions, animations, and `scroll-behavior: smooth`. The page remains fully functional without motion.

---

## Component Patterns

### Hero

Full-viewport section with centered text. Contains:

- **Constellation canvas** — animated authorization graph visualization (z-index: 2)
- **Glow** — subtle amber radial gradient behind content (z-index: 1)
- **Dot grid** — background texture, masked to center (z-index: 0)
- **Title** — largest type on the page, supports cycling text animation
- **Subtitle** — `--text-secondary`, deliberately lower contrast than body text
- **Actions** — primary (amber solid) + ghost (bordered) button pair

### Statement

Centered typographic block. Large text, `--text` color, bold first sentence in `--text-white`. No heading element visible (uses `sr-only` h2 for accessibility). Max-width 720px. Used for high-impact claims that don't need a traditional heading + body structure.

### Feature Split

Two-column asymmetric layout:

- **Left column**: Display heading in `--text-white`. Communicates the value proposition.
- **Right column**: Body text in `--text-secondary`. Provides specifics, ends with an amber link.
- **Visual** (optional): Full-width code window below the split. Margin-top: 3rem.

Consecutive feature sections collapse spacing between them (no border, no padding-top on the second).

### Use Cases (Minimal)

Three-column text grid. No cards, no icons, no backgrounds. Each item has:

- **Heading**: `--text-white`, links to solution page, turns amber on hover
- **Body**: `--text`, 0.9375rem, 1.7 line-height

### Code Window

Bordered container with dot header and syntax-highlighted code:

- Header: three dots + monospaced filename
- Code: `--font-mono` at 0.8125rem
- Syntax colors: amber (keywords), teal (types), green (strings), `--text-bright` (functions)
- Hover: border lightens, subtle amber box-shadow appears

### CTA

Centered large heading + button pair. The heading uses display type at the largest scale after the hero. Functions as a closing statement, not a repeated pitch. Dot grid background matches the hero for visual bookending.

### Buttons

| Variant | Background      | Text                 | Border                      |
| ------- | --------------- | -------------------- | --------------------------- |
| Primary | `var(--accent)` | `#0b0d11`            | None                        |
| Ghost   | Transparent     | `var(--text-bright)` | `var(--border-interactive)` |

Both variants: 44px minimum height, 2px radius, mechanical easing. Primary gets a subtle box-shadow on hover. Both shift 1px down on `:active`.

---

## Homepage Section Order

```
Hero          — "Know who can access what in every application"
Statement     — Problem framing: #1 risk, $4.88M, $900K
Feature       — Permissions: schema definition + code window
Feature       — Performance: numbers woven into prose
Feature       — Audit: cryptographic proof + audit JSON
Use Cases     — SaaS / Compliance / AI Agents (minimal text grid)
CTA           — "Try it free. Deploy in minutes, not months."
```

This follows a narrative arc: **identity → crisis → solution → proof → proof → relevance → action**.

---

## What NOT to Do

- **Don't use cards for stat grids.** Weave numbers into prose or statement blocks.
- **Don't use tabbed interfaces on marketing pages.** Split into stacked sections instead.
- **Don't center section headings when there's adjacent body text.** Use the asymmetric split.
- **Don't repeat CTA buttons between every section.** Hero + closing CTA is sufficient; a floating nav CTA handles mid-page conversion.
- **Don't use icons as section decoration.** Let typography and whitespace create hierarchy.
- **Don't use comparison tables on the homepage.** Link to a dedicated comparison page instead.
- **Don't use pure black (`#000`) or pure white (`#fff`).** Everything is tinted slate.
- **Don't add rounded corners above 3px.** Angular, industrial aesthetic.
- **Don't use neon glow, lens flare, or gradient backgrounds.** Lighting is cool and diffuse.
- **Don't use emoji in the UI.**
- **Don't reduce section padding below 5rem (mobile) or 8rem (desktop).** Breathing room is structural, not cosmetic.
- **Don't add decorative elements to fill whitespace.** Whitespace is the design.

---

## Responsive Strategy

Single primary breakpoint at **768px**. Typography scales via `clamp()` across the full viewport range — no breakpoint-specific font sizes.

| Pattern         | Desktop       | Mobile (≤768px)   |
| --------------- | ------------- | ----------------- |
| Feature split   | 2-column grid | Stacked           |
| Use cases grid  | 3-column      | Stacked           |
| Hero actions    | Horizontal    | Stacked, centered |
| CTA actions     | Horizontal    | Stacked, centered |
| Section padding | 8–10rem       | 5rem              |

Container queries (`@container`) are used for component-level responsiveness where appropriate (e.g., card grids collapsing at 640px container width).

---

## File Organization

```
_sass/
├── foundation/          # Tokens, mixins, reset, base typography
│   ├── _variables.scss  # All CSS custom properties
│   ├── _mixins.scss     # Reusable style patterns
│   ├── _properties.scss # @property definitions for animation
│   ├── _reset.scss      # CSS reset (layered)
│   └── _base.scss       # Body, headings, links, selection
├── atoms/               # Buttons, badges, labels, icons
├── molecules/           # Cards, code windows, forms, section headers
├── organisms/           # Hero, nav, footer, feature-split, statement, CTA, etc.
├── pages/               # Page-specific layouts
└── utilities/           # Accessibility, animations, syntax highlighting
```

Each partial owns its responsive breakpoints (colocated, not centralized). The import order in `main.scss` follows atomic design: foundation → atoms → molecules → organisms → pages → utilities.
