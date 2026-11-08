#!/usr/bin/env bash
# Branch previews for the Pages deploy: every branch not yet merged into main
# and pushed in the last 14 days is built into dist/preview/<branch>/, played
# at deeek.org/signoff/preview/<branch>/ (slashes become dashes), with a list
# at deeek.org/signoff/preview/. Run after the main build, from a checkout
# with every branch fetched (fetch-depth: 0). A branch that fails to build is
# skipped, never the deploy.
set -u
DAYS=${PREVIEW_DAYS:-14}
now=$(date +%s)
mkdir -p dist/preview
rows=""
for ref in $(git for-each-ref --format='%(refname:short)' refs/remotes/origin); do
  branch=${ref#origin/}
  case "$branch" in main | HEAD | origin) continue ;; esac
  # Merged already: every commit of its own is in main, as the same change or
  # (rebased with fixes on the way in) under the same subject.
  own=0
  for c in $(git cherry origin/main "$ref" | sed -n 's/^+ //p'); do
    git log --format=%s origin/main | grep -qxF "$(git log -1 --format=%s "$c")" || { own=1; break; }
  done
  [ "$own" = 1 ] || continue
  when=$(git log -1 --format=%ct "$ref")
  [ $((now - when)) -gt $((DAYS * 86400)) ] && continue
  slug=$(printf '%s' "$branch" | tr '/' '-' | tr -cd 'A-Za-z0-9._-')
  dir=$(mktemp -d)
  echo "::group::preview of $branch"
  if git worktree add --detach "$dir" "$ref" &&
    (cd "$dir" && npm ci --no-audit --no-fund && SIGNOFF_BASE="/signoff/preview/$slug/" SIGNOFF_PREVIEW="$branch" npx vite build); then
    rm -rf "dist/preview/$slug"
    cp -r "$dir/dist" "dist/preview/$slug"
    # No service worker for previews (a branch from before they were turned off may still build one).
    rm -f "dist/preview/$slug/sw.js" "dist/preview/$slug"/workbox-*.js
    subject=$(git log -1 --format=%s "$ref" | sed 's/&/\&amp;/g; s/</\&lt;/g')
    day=$(git log -1 --format=%cs "$ref")
    rows="$rows<li><a href=\"$slug/\">$branch</a><br><small>$day · $subject</small></li>"
  else
    echo "::warning::preview of $branch failed to build; skipped"
  fi
  echo "::endgroup::"
  git worktree remove --force "$dir" >/dev/null 2>&1 || rm -rf "$dir"
done
[ -n "$rows" ] || rows="<li>No branches to preview right now.</li>"
cat >dist/preview/index.html <<HTML
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>SIGN-OFF previews</title>
<style>body{background:#0b0b0f;color:#ddd;font:16px/1.5 ui-monospace,monospace;margin:0;padding:24px 16px;max-width:720px}
a{color:#7fd7ff;font-size:1.15em}li{margin:0 0 14px}small{color:#999}h1{font-size:1.2em;letter-spacing:.2em}</style></head>
<body><h1>SIGN-OFF · BRANCH PREVIEWS</h1><p>Work in progress, not yet on <a href="../">the game</a>.</p><ul>$rows</ul></body></html>
HTML
