#!/usr/bin/env bash
#
# marlowe-trigger.sh
#
# PostToolUse hook for the InferaDB site project. When a marketing-surface
# file is modified via Edit/Write/MultiEdit, this hook injects a system
# reminder that the main agent should consider invoking the
# marlowe-content-auditor subagent before declaring the work done.
#
# The hook is intentionally a soft nudge, not a forcing function. The main
# agent decides whether to invoke based on context (e.g., a typo fix
# probably doesn't warrant a full audit; a hero rewrite definitely does).
#
# Wired up in .claude/settings.json under hooks.PostToolUse.

set -euo pipefail

INPUT="$(cat)"

TOOL_NAME="$(printf '%s' "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null || echo "")"
FILE_PATH="$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null || echo "")"

# Only trigger on file-mutating content tools.
case "$TOOL_NAME" in
  Edit|Write|MultiEdit) ;;
  *) exit 0 ;;
esac

# Empty file_path means we have nothing to match — bail silently.
[[ -z "$FILE_PATH" ]] && exit 0

# Marketing surfaces. Anything matching these triggers the reminder.
# Patterns are POSIX extended regex matched against the full file_path.
MARKETING_PATTERNS=(
  '/index\.html$'
  '/about\.html$'
  '/pricing\.html$'
  '/contact\.html$'
  '/careers\.html$'
  '/why\.html$'
  '/waitlist\.html$'
  '/learn/.*\.html$'
  '/product/.*\.html$'
  '/solutions/.*\.html$'
  '/migrate/.*\.html$'
  '/_includes/footer\.html$'
  '/_includes/nav\.html$'
  '/_includes/trust-strip\.html$'
  '/_data/nav\.yml$'
  '/_data/banner\.yml$'
  '/_data/features\.yml$'
)

is_marketing_file=false
for pattern in "${MARKETING_PATTERNS[@]}"; do
  if [[ "$FILE_PATH" =~ $pattern ]]; then
    is_marketing_file=true
    break
  fi
done

[[ "$is_marketing_file" != "true" ]] && exit 0

# Emit a system reminder. The main agent will see this and decide whether
# to dispatch the subagent. Use additionalContext for non-blocking nudges.
cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "[marlowe-trigger] A marketing surface was just modified ($FILE_PATH). Before declaring this work done, consider whether the change warrants dispatching the marlowe-content-auditor subagent. Skip if this was trivial (typo fix, link update, image swap, formatting only). Dispatch if the change touches copy, hero/CTA structure, voice, proof claims, or audience targeting. The subagent reads its full persona from docs/personas/marlowe-content-auditor.md."
  }
}
EOF

exit 0
