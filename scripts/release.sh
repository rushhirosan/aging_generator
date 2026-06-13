#!/usr/bin/env bash
# Future Self Interview — release checks → optional commit → push
# Production deploy is handled by Vercel GitHub integration (push to main).
#
#   ./scripts/release.sh
#   ./scripts/release.sh --ship

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

COMMIT_MSG=""
DO_PUSH=false
DO_SHIP=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --commit)
      COMMIT_MSG="${2:-}"
      if [[ -z "$COMMIT_MSG" ]]; then echo "error: --commit needs a message"; exit 1; fi
      shift 2
      ;;
    --push) DO_PUSH=true; shift ;;
    --ship)
      DO_SHIP=true
      DO_PUSH=true
      shift
      ;;
    -h|--help)
      cat <<EOF
Usage: $0 [--ship | --commit MSG [--push]]

  (no args)   npm run build + secret scan
  --ship      checks → auto commit → push origin main

Deploy: Vercel GitHub 連携（push to main で自動デプロイ）。CLI / vercel login は不要。
EOF
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

generate_auto_commit_subject() {
  local files=() line
  while IFS= read -r line; do
    [[ -n "$line" ]] && files+=("$line")
  done < <(git diff --cached --name-only)
  [[ ${#files[@]} -eq 0 ]] && return 1

  local has_api=false has_ui=false has_docs=false
  for line in "${files[@]}"; do
    case "$line" in
      lib/*) has_api=true ;;
      app/*|components/*) has_ui=true ;;
      docs/*|*.md) has_docs=true ;;
    esac
  done

  local prefix="feat"
  local scope=""
  if [[ "$has_api" == true && "$has_ui" == false ]]; then
    prefix="feat"; scope="api"
  elif [[ "$has_docs" == true && "$has_api" == false && "$has_ui" == false ]]; then
    prefix="docs"; scope=""
  elif [[ "$has_api" == true ]]; then
    prefix="feat"; scope=""
  else
    prefix="chore"; scope=""
  fi

  local subject
  if [[ -n "$scope" ]]; then
    subject="${prefix}(${scope}): Future Self Interview BYOK demo"
  else
    subject="${prefix}: Future Self Interview initial release"
  fi
  echo "$subject"
}

generate_auto_commit_body() {
  local n
  n=$(git diff --cached --name-only | wc -l | tr -d ' ')
  [[ "$n" -eq 0 ]] && return 1
  echo "Changed paths (${n}):"
  git diff --cached --name-only | sed 's/^/- /'
}

assert_on_main_branch() {
  local cur
  cur="$(git branch --show-current)"
  if [[ "$cur" != "main" ]]; then
    echo "ERROR: push requires main branch (current: ${cur})"
    exit 1
  fi
}

echo "==> 1/2 npm run build"
npm run build

echo "==> 2/2 secret scan (tracked files)"
FOUND=0
while IFS= read -r -d '' f; do
  case "$f" in
    *.png|*.jpg|*.jpeg|*.gif|*.webp|*.ico|*.pdf) continue ;;
  esac
  if grep -qE '(ghp_[a-zA-Z0-9]{20,}|github_pat_[a-zA-Z0-9_]+|sk-[a-zA-Z0-9_]{20,}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----|AIza[0-9A-Za-z_-]{35})' "$f" 2>/dev/null; then
    echo "  suspicious pattern: $f"
    FOUND=1
  fi
done < <(git ls-files -z 2>/dev/null || true)

if [[ "$FOUND" -ne 0 ]]; then
  echo "ERROR: remove secrets from tracked files before shipping"
  exit 1
fi

if [[ -n "$COMMIT_MSG" ]] || [[ "$DO_SHIP" == true ]]; then
  git add -A
fi

if [[ -n "$COMMIT_MSG" ]]; then
  if git diff --cached --quiet; then
    echo "nothing to commit"
  else
    git commit -m "$COMMIT_MSG"
  fi
elif [[ "$DO_SHIP" == true ]]; then
  if git diff --cached --quiet; then
    echo "nothing to commit"
  else
    AUTO_SUBJECT="$(generate_auto_commit_subject)"
    AUTO_BODY="$(generate_auto_commit_body)"
    echo "==> git commit: $AUTO_SUBJECT"
    git commit -m "$AUTO_SUBJECT" -m "$AUTO_BODY"
  fi
fi

if [[ "$DO_PUSH" == true ]]; then
  assert_on_main_branch
  if ! git remote get-url origin >/dev/null 2>&1; then
    echo "WARN: no git remote 'origin' — skipping push"
  else
    echo "==> git push origin main"
    git push origin main
    echo "==> GitHub 連携で Vercel が自動デプロイします（CLI 不要）"
  fi
fi

echo "OK: release complete"
