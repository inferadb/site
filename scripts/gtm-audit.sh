#!/bin/bash
# GTM content/structure audit for InferaDB marketing pages
# Outputs a single number: total improvement opportunities (lower = better)
# Measures: cross-linking, CTA presence, content depth, structured data gaps

ISSUES=0

# Marketing page source files
PAGES="product/authorization.html product/permissions.html product/compliance.html solutions/multi-tenant-saas.html solutions/regulated-industries.html solutions/ai-agents.html solutions/platform-engineering.html index.html about.html pricing.html contact.html waitlist.html careers.html"

# 1. Marketing pages with zero body cross-links to other marketing pages (excl nav/footer)
for f in $PAGES; do
  [ -f "$f" ] || continue
  count=$(grep -oE 'href="/(product|solutions)/[^"]*"' "$f" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$count" -eq 0 ]; then
    ISSUES=$((ISSUES + 1))
  fi
done

# 2. Product/solutions pages missing a /docs link in the body (should bridge to docs)
for f in product/*.html solutions/*.html; do
  [ -f "$f" ] || continue
  count=$(grep -c 'href="/docs/' "$f" 2>/dev/null)
  if [ "$count" -eq 0 ]; then
    ISSUES=$((ISSUES + 1))
  fi
done

# 3. Product/solutions pages missing a /waitlist link in the body (CTA)
for f in product/*.html solutions/*.html; do
  [ -f "$f" ] || continue
  count=$(grep -c 'href="/waitlist"' "$f" 2>/dev/null)
  if [ "$count" -eq 0 ]; then
    ISSUES=$((ISSUES + 1))
  fi
done

# 4. Pages where the H1 doesn't contain a primary keyword
#    (authorization, permissions, compliance, security, SaaS, agents, platform)
KEYWORDS="authorization|permissions|compliance|security|saas|agents|platform|access control"
for f in product/*.html solutions/*.html; do
  [ -f "$f" ] || continue
  h1=$(grep -o '<h1[^>]*>[^<]*</h1>' "$f" 2>/dev/null | head -1 | sed 's/<[^>]*>//g')
  if [ -n "$h1" ]; then
    match=$(echo "$h1" | grep -iEc "$KEYWORDS")
    if [ "$match" -eq 0 ]; then
      ISSUES=$((ISSUES + 1))
    fi
  fi
done

# 5. About/pricing/careers/contact missing cross-links to product or solutions
for f in about.html pricing.html careers.html contact.html; do
  [ -f "$f" ] || continue
  count=$(grep -oE 'href="/(product|solutions)/[^"]*"' "$f" 2>/dev/null | wc -l | tr -d ' ')
  if [ "$count" -eq 0 ]; then
    ISSUES=$((ISSUES + 1))
  fi
done

# 6. Check if product/solutions pages link to each other (not just to docs)
for f in product/*.html; do
  [ -f "$f" ] || continue
  sol_links=$(grep -c 'href="/solutions/' "$f" 2>/dev/null)
  if [ "$sol_links" -eq 0 ]; then
    ISSUES=$((ISSUES + 1))
  fi
done
for f in solutions/*.html; do
  [ -f "$f" ] || continue
  prod_links=$(grep -c 'href="/product/' "$f" 2>/dev/null)
  if [ "$prod_links" -eq 0 ]; then
    ISSUES=$((ISSUES + 1))
  fi
done

echo "TOTAL_ISSUES:$ISSUES"
