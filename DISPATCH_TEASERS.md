# Dispatch Teaser SVGs

## Design Principles

Teaser images for Dispatch posts are abstract, minimal SVG illustrations rendered in white line art on a transparent background. They convey the concept of a post through symbology alone — no text, no color, no decoration.

### Aesthetic: Nu-Brutalist Minimalism

- **White only.** All elements use `#dce1e8` (the site's `--text-white` token). No amber, no color coding, no gradients.
- **Transparent background.** The SVG has no background fill. The `.dispatch-entry-teaser` container provides a `--border` colored background.
- **Bold stroke weights.** Primary shapes use 2-3px strokes. Interior details use 0.5-1.5px. The contrast between thick and thin creates hierarchy without color.
- **Confident imperfection.** Elements may overshoot containers, vary in size where uniformity is expected, or sit slightly off-grid. This is deliberate — it creates visual tension and avoids the sterile feeling of pixel-perfect alignment.
- **Nothing extra.** No background grids, corner brackets, scan lines, annotations, or technical chrome. Just the subject.

### Conceptual Approach

Each teaser should communicate the post's core concept through a single abstract visual metaphor. The reader should sense the topic without reading the title.

- **Start with the concept, not the aesthetic.** Ask: "What is the one idea this post conveys?" Then find the simplest geometric form that expresses it.
- **Prefer universally recognizable shapes.** A shield means security. A grid of dots means evaluation. Connected nodes mean relationships. Don't invent symbols when established ones exist.
- **One composition per image.** One visual idea, centered in the viewbox. No narratives, no sequences, no before/after.

### Technical Specs

- **Viewbox:** `0 0 960 400` (same aspect ratio as the teaser container)
- **No `<rect>` background fill** — must be transparent
- **All shapes use `fill="none"` with `stroke="#dce1e8"` for outlines, or `fill="#dce1e8"` for solid elements**
- **Center the composition** using a `<g transform="translate(480, 200)">` wrapper (adjust Y for optical balance)
- **File location:** `/assets/images/dispatch/{slug}.svg`

### Existing Examples

| Post | Concept | Visual |
|---|---|---|
| Authorization Compared | Four products side by side | Four distinct geometric symbols in a row — hexagon, square, diamond, circle — each with unique internal structure |
| CISO Guide | Fine-grained permissions | A ring of individually placed dots that forms a circle — each dot is a discrete permission, together they form the whole |
| Buyer's Checklist | Systematic evaluation | A grid of filled and hollow circles — rows are dimensions, columns are vendors, filled means pass |

### Wiring Up

**Teaser** (dispatch index card) — add `teaser:` field in `_data/now.yml`:

```yaml
- title: "Post Title"
  teaser: /assets/images/dispatch/post-slug.svg
```

**Hero** (post page) — add `hero:` field in the post's front matter:

```yaml
hero: /assets/images/dispatch/post-slug.svg
```

Both are optional and independent. A post can have a teaser, a hero, both, or neither.
