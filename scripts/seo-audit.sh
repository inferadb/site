#!/bin/bash
# SEO/GTM audit script for InferaDB site
# Outputs a single number: total issues found (lower = better)
# Run after `bundle exec jekyll build`

SITE_DIR="${1:-_site}"
ISSUES=0

# 1. Titles over 60 chars (Google truncates at ~60)
#    Only match the first <title> per file; decode HTML entities for accurate length
LONG_TITLES=$(find "$SITE_DIR" -name 'index.html' -exec grep -m1 -o '<title>[^<]*</title>' {} \; | sed 's/&amp;/\&/g;s/&micro;/µ/g;s/&ndash;/–/g;s/&mdash;/—/g' | awk -F'[<>]' '{if(length($3) > 60) print}' | wc -l | tr -d ' ')
ISSUES=$((ISSUES + LONG_TITLES))

# 2. Meta descriptions over 160 chars (Google truncates at ~155-160)
LONG_DESCS=$(find "$SITE_DIR" -name 'index.html' -exec grep -o 'name="description" content="[^"]*"' {} \; | awk -F'"' '{if(length($4) > 160) print}' | wc -l | tr -d ' ')
ISSUES=$((ISSUES + LONG_DESCS))

# 3. Duplicate titles (first <title> per file only)
DUP_TITLES=$(find "$SITE_DIR" -name 'index.html' -exec grep -m1 -o '<title>[^<]*</title>' {} \; | sort | uniq -d | wc -l | tr -d ' ')
ISSUES=$((ISSUES + DUP_TITLES))

# 4. Missing meta descriptions
MISSING_DESC=$(find "$SITE_DIR" -name 'index.html' -exec grep -L 'name="description"' {} \; | wc -l | tr -d ' ')
ISSUES=$((ISSUES + MISSING_DESC))

# 5. Stale internal links (old product URLs)
STALE_LINKS=$(grep -rl '/product/engine\|/product/policy-language\|/product/audit' "$SITE_DIR" --include='*.html' 2>/dev/null | wc -l | tr -d ' ')
ISSUES=$((ISSUES + STALE_LINKS))

# 6. Pages missing og:image
MISSING_OG=$(find "$SITE_DIR" -name 'index.html' -exec grep -L 'og:image' {} \; | wc -l | tr -d ' ')
ISSUES=$((ISSUES + MISSING_OG))

# Output breakdown then total
echo "long_titles:$LONG_TITLES long_descs:$LONG_DESCS dup_titles:$DUP_TITLES missing_desc:$MISSING_DESC stale_links:$STALE_LINKS missing_og:$MISSING_OG"
echo "TOTAL_ISSUES:$ISSUES"
