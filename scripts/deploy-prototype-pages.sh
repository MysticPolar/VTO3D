#!/usr/bin/env bash
# Publish reference/prototype to the gh-pages branch, which GitHub Pages serves at
# https://mysticpolar.github.io/VTO3D/. Run from anywhere inside the repo.
# Replace this with the web app's own build once Phase 0 exists.
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
src="$root/reference/prototype"
remote="$(git -C "$root" remote get-url origin)"
rev="$(git -C "$root" rev-parse --short HEAD)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

if git -C "$root" ls-remote --exit-code --heads origin gh-pages >/dev/null 2>&1; then
  git clone --quiet --depth 1 --branch gh-pages "$remote" "$tmp"
else
  git -C "$tmp" init --quiet -b gh-pages
  git -C "$tmp" remote add origin "$remote"
fi

# Replace the site with the current prototype (the asset-pipeline tools aren't part of it).
find "$tmp" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -R "$src"/. "$tmp"/
rm -rf "$tmp/tools"
touch "$tmp/.nojekyll" # serve the files as they are, without a Jekyll build

git -C "$tmp" add -A
if git -C "$tmp" diff --cached --quiet; then
  echo "gh-pages is already up to date"
  exit 0
fi
git -C "$tmp" commit --quiet -m "Deploy prototype from $rev"
git -C "$tmp" push --quiet origin gh-pages
echo "Pushed gh-pages ($rev). The site updates in about a minute."
