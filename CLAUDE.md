# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

The InferaDB marketing site and documentation at inferadb.com. A static Jekyll site deployed to GitHub Pages. No plugins — GitHub Pages' built-in Jekyll 3.10.0 processes everything.

## Build and Serve

```bash
bundle exec jekyll serve     # Serve locally (always use bundle exec)
bundle exec jekyll build     # Build to _site/
```

Requires Ruby 3.2.0 (managed via mise — see `.mise.toml`). The `github-pages` gem pins Jekyll 3.10.0 and all dependencies to match the GitHub Pages environment exactly.

## GitHub Pages Constraints

This site MUST build on GitHub Pages' Jekyll 3.10.0 pipeline. Key restrictions:

- **No custom plugins** — `safe: true` is enforced
- **Sass 3.7.4 (LibSass)** — no `@use`/`@forward` (Dart Sass only), only `@import`
- **Liquid 4.0.4** — no pipe filters inside `if`/`or` conditions; use `assign` first
- **No `clamp()` in Sass** — but CSS `clamp()` passes through as a literal and works fine
- **Jekyll processes both `.md` and `.html`** with the same stem — only one can exist (e.g., `docs/index.md` and `docs/index.html` conflict; delete one)
- **CLAUDE.md is excluded** in `_config.yml` because its Liquid-like code examples (`assign`) cause parse errors

## Visual Design System — Mil-Spec Hard Sci-Fi Industrial

The site uses a distinctive industrial aesthetic inspired by NASA/aerospace documentation, Neon Genesis Evangelion mechanical design, and hard sci-fi UI (Marathon, Dead Space). This is NOT a generic dark-mode SaaS template.

### Color Palette

| Token            | Value     | Usage                                       |
| ---------------- | --------- | ------------------------------------------- |
| `--bg`           | `#0b0d11` | Dark slate (blue-tinted, not neutral black) |
| `--text`         | `#7d8590` | Body text (cool slate gray)                 |
| `--text-white`   | `#dce1e8` | Headings (cool off-white, never pure white) |
| `--accent`       | `#c8a44e` | Primary accent — hazard amber               |
| `--accent-teal`  | `#56b6c2` | Secondary — desaturated teal (types, info)  |
| `--accent-red`   | `#d45858` | Errors, denied states                       |
| `--accent-green` | `#6a9e4a` | Success, allowed states                     |
| `--border`       | `#1c2028` | Panel edges (subtle, not prominent)         |
| `--border-interactive` | `#3a4250` | Interactive element borders (3:1 vs bg) |

### Typography

- **Display headings**: Figtree (`--font-display`)
- **Body text**: Inter (`--font-sans`)
- **Technical labels, readouts, dates, codes**: JetBrains Mono (`--font-mono`)

Monospaced type is used heavily for: hero eyebrow (`SYS:INFERADB //`), credibility bar, stat numbers, diff-highlight badges, category labels on Now cards, tab navigation, CTA eyebrow, and changelog dates. This creates the "data readout" feeling.

### Design Rules

- **Border radius: 3px/2px** — angular, not rounded. Industrial, not consumer.
- **No purple/pink** — the old gradient accent was replaced with hazard amber.
- **`gradient-text` used sparingly** — only in the hero title and CTA, nowhere else.
- **Nav has a 2px amber top-border** — status indicator strip, like a control panel.
- **Buttons are solid amber with dark text** — not gradient, not outlined.
- **Code syntax highlighting** uses amber (keywords), teal (types), green (strings/literals).
- **`text-wrap: balance`** on headings, **`text-wrap: pretty`** on paragraphs.

### What NOT To Do

- Don't use pure black (`#000`) or pure white (`#fff`) — everything is tinted slate.
- Don't add rounded corners above 3px — this is an angular design.
- Don't use neon glow, lens flare, or gradient backgrounds — lighting is cool and diffuse.
- Don't use emoji in the UI.
- Don't make it look like every other SaaS site.

## Accessibility (WCAG 2.1 AA)

This site targets WCAG 2.1 AA compliance. All changes must maintain these standards.

### Color Contrast

All text colors meet 4.5:1 contrast ratio against both `--bg` (#0b0d11) and `--bg-card` (#10131a):

| Token | Value | vs bg | vs card |
|-------|-------|-------|---------|
| `--text` | `#7d8590` | 5.21:1 | 4.98:1 |
| `--text-secondary` | `#778189` | 4.89:1 | 4.68:1 |
| `--accent` | `#c8a44e` | 8.22:1 | 7.85:1 |
| `--accent-teal` | `#56b6c2` | 8.21:1 | 7.85:1 |
| `--accent-red` | `#d45858` | 4.94:1 | 4.72:1 |
| `--accent-green` | `#6a9e4a` | 6.11:1 | 5.84:1 |

`--muted` (#555d68, ~2.9:1) is for decorative elements only (borders, separators) — **never use it for essential text**.

### Color Blindness

Red and green accents are confusable with amber for deuteranopes (~6% of males). **Never use color alone to convey status** — always pair with text labels or icons. Currently OK because red/green only appear alongside text (syntax highlighting, "Available" badge).

### Keyboard Navigation

- **`:focus-visible`** provides a 2px amber outline on all interactive elements
- **`:focus:not(:focus-visible)`** removes the ring for mouse users only
- **Skip navigation link** (`<a class="skip-link">`) jumps to `<main id="main-content">`
- Form inputs use `border-color + box-shadow` on focus (never `outline: none` alone)

### Screen Readers

- All decorative SVGs have `aria-hidden="true"`
- Logo SVG uses `aria-hidden="true"` (adjacent text provides the label)
- Footer social links have `aria-label`
- Docs sidebar uses `aria-current="page"` for active links
- Scrollable code blocks get `tabindex="0"`, `role="region"`, and `aria-label` via JS

### Touch Targets

- Minimum 44x44px for buttons and nav toggle (WCAG 2.5.8 AAA)
- Tab navigation items have `min-height: 2.75rem` (44px)
- Sidebar nav links have `padding: 0.375rem` (~30px, adequate for sidebar context)

### Motion & Preferences

- `@media (prefers-reduced-motion: reduce)` disables all transitions, animations, and `scroll-behavior: smooth`
- `@media (forced-colors: active)` ensures borders and focus indicators remain visible in Windows High Contrast Mode

### Font Sizes

- Minimum font size: `0.6875rem` (11px) — used only for monospaced technical labels
- Body text: `0.9375rem` (15px) minimum
- No `maximum-scale` or `user-scalable=no` on viewport — zoom is never blocked

### Forms

- All inputs have associated `<label>` elements with `for` attributes
- `autocomplete` attributes on name and email fields (`given-name`, `family-name`, `email`, `name`)

## Site Architecture

### Layouts (`_layouts/`)

| Layout         | Wraps                                                | Used by                             |
| -------------- | ---------------------------------------------------- | ----------------------------------- |
| `default.html` | Base HTML (head, nav, footer, scripts)               | All other layouts                   |
| `page.html`    | Centered article with header                         | `contact.html`                      |
| `docs.html`    | Sidebar + content with nav from `_data/docs_nav.yml` | All `/docs/` pages                  |
| `now.html`     | Header + category tabs + content area                | All `/now/` and `/changelog/` pages |
| `post.html`    | Full article with breadcrumb (Now / category / date) | Individual Now posts                |

### Content Sections

**Marketing pages** (root): `index.html`, `about.html`, `pricing.html`, `contact.html`, `waitlist.html`

**Documentation** (`docs/`): 34 pages including SDK docs for 10 languages. Index page (`docs/index.html`) is a card-based hub, not prose. Individual pages are markdown with `layout: docs` front matter. Sidebar navigation driven by `_data/docs_nav.yml`.

**Now section** (`now/`): Three rendering patterns:

- **Cards → full pages**: `now/index.html`, `now/news.html`, `now/ai.html`, `now/practices.html` — use `_includes/now-cards.html`, entries from `_data/now.yml`, link to individual `.md` posts in `now/`
- **Inline timeline**: `changelog.html` — uses `_includes/now-timeline.html`, entries from `_data/changelog.yml` with full markdown body rendered inline
- **External links**: `now/press.html` — uses `_includes/now-press.html`, entries from `_data/press.yml` with external URLs

### Data Files (`_data/`)

| File            | Drives                                                       |
| --------------- | ------------------------------------------------------------ |
| `nav.yml`       | Top navigation links                                         |
| `docs_nav.yml`  | Documentation sidebar sections and links                     |
| `features.yml`  | Homepage differentiator cards                                |
| `now.yml`       | Now posts (news, ai, practices) — linked to individual pages |
| `changelog.yml` | Changelog entries with inline `body` markdown                |
| `press.yml`     | Press entries with external `url` fields                     |
| `socials.yml`   | Social links in footer                                       |

### Styles

Single SCSS file at `_sass/main.scss`, imported via `assets/css/styles.scss` (which has empty front matter to trigger Jekyll processing). All CSS variables, component styles, responsive breakpoints, and page-specific styles are in this one file.

### Logo

The logo (`_includes/logo.svg`) is a hexagonal frame containing three connected graph nodes — representing authorization relationships within a security perimeter. It uses `currentColor` to inherit text color. The favicon (`assets/images/favicon.svg`) uses the amber accent color directly.

## Forms

Waitlist and contact forms use Formspree:

- Waitlist: `xqeyryaq`
- Contact: `xzdjnjza`
