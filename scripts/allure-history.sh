#!/usr/bin/env bash
# Downloads the Allure history of the last published report (GitHub Pages) so trend charts
# keep growing between runs, without a gh-pages branch.
#
#   ./scripts/allure-history.sh <owner/repo> <target-dir>
set -uo pipefail

REPO="${1:?owner/repo required}"
TARGET="${2:?target dir required}"
OWNER="$(echo "${REPO%%/*}" | tr '[:upper:]' '[:lower:]')"
NAME="${REPO##*/}"
BASE="https://${OWNER}.github.io/${NAME}/allure/history"

mkdir -p "$TARGET"
for file in history.json history-trend.json duration-trend.json categories-trend.json retry-trend.json; do
  if curl -fsSL "$BASE/$file" -o "$TARGET/$file"; then
    echo "restored $file"
  else
    rm -f "$TARGET/$file"
    echo "no previous $file (first publication?)"
  fi
done
exit 0
