#!/bin/bash
# Quality signals audit for InferaDB marketing site
# Measures: generic anchor text, missing noopener, structured data gaps,
#           social sharing signals, and content quality markers
# Lower = better

SITE_DIR="${1:-_site}"
ISSUES=0

# 1. Generic anchor text in source files ("learn more", "click here", "here", "this")
for f in product/*.html solutions/*.html index.html about.html pricing.html contact.html waitlist.html careers.html; do
  [ -f "$f" ] || continue
  count=$(grep -oiE '>[[:space:]]*(click here|read more|learn more|here|this link)[[:space:]]*<' "$f" 2>/dev/null | wc -l | tr -d ' ')
  ISSUES=$((ISSUES + count))
done

# 2. External links missing rel="noopener" (security + SEO signal)
#    Compare counts: every target="_blank" should have a matching rel="noopener"
for f in product/*.html solutions/*.html index.html about.html pricing.html contact.html waitlist.html careers.html; do
  [ -f "$f" ] || continue
  blanks=$(grep -c 'target="_blank"' "$f" 2>/dev/null)
  openers=$(grep -c 'rel="noopener"' "$f" 2>/dev/null)
  diff=$((blanks - openers))
  if [ "$diff" -gt 0 ]; then
    ISSUES=$((ISSUES + diff))
  fi
done

# 3. Product/solutions pages without page-specific structured data
#    (beyond the global SoftwareApplication + Organization from default.html)
for f in "$SITE_DIR"/product/*/index.html "$SITE_DIR"/solutions/*/index.html; do
  [ -f "$f" ] || continue
  # Count ld+json blocks — global template contributes 2 (SoftwareApplication + Organization)
  # seo-tag contributes 1 (WebPage/WebSite). Anything above 3 = page-specific.
  blocks=$(grep -c 'application/ld+json' "$f")
  if [ "$blocks" -le 3 ]; then
    ISSUES=$((ISSUES + 1))
  fi
done

# 4. Marketing pages where og:description differs from meta description
#    (they should match for consistent sharing)
for f in "$SITE_DIR"/product/*/index.html "$SITE_DIR"/solutions/*/index.html "$SITE_DIR"/index.html; do
  [ -f "$f" ] || continue
  meta=$(grep -o 'name="description" content="[^"]*"' "$f" | awk -F'"' '{print $4}')
  og=$(grep -o 'og:description" content="[^"]*"' "$f" | awk -F'"' '{print $4}')
  if [ "$meta" != "$og" ] && [ -n "$meta" ] && [ -n "$og" ]; then
    ISSUES=$((ISSUES + 1))
  fi
done

# 5. Dispatch category pages with og:type "website" instead of expected type
for f in "$SITE_DIR"/dispatch/*/index.html; do
  [ -f "$f" ] || continue
  # Skip the main dispatch index
  dirname=$(basename "$(dirname "$f")")
  [ "$dirname" = "dispatch" ] && continue
  # Individual posts should ideally be "article", category pages "website" is OK
done

# 6. Pages missing explicit meta robots (not critical but good practice)
#    Actually, absence means "index,follow" which is correct. Skip this.

# 7. Check if about.html external links have noopener (found 2 missing earlier)
about_missing=$(grep 'target="_blank"' about.html 2>/dev/null | grep -vc 'rel="noopener"')
# Already counted in check 2, don't double-count

echo "TOTAL_ISSUES:$ISSUES"
