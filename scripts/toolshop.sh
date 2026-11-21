#!/usr/bin/env bash
# Start/stop Practice Software Testing (Toolshop) locally with Docker, using the
# pre-built images published by testsmith-io. Used both on a laptop and in CI.
#
#   ./scripts/toolshop.sh up      # clone (pinned), start, seed, wait until healthy
#   ./scripts/toolshop.sh seed    # reset the database to the seeded state
#   ./scripts/toolshop.sh logs    # last lines of every container
#   ./scripts/toolshop.sh down    # stop and remove containers + volumes
#   ./scripts/toolshop.sh save <file.tar>   # pull/build every image and save them (CI cache)
#   ./scripts/toolshop.sh load <file.tar>   # load images saved before (no Docker Hub pulls)
set -euo pipefail

# Pin the upstream revision so the app (and therefore screenshots/budgets) never changes under our feet.
TOOLSHOP_REF="${TOOLSHOP_REF:-ae7caecb811dd8952c09d997e69be7cb946ecd44}"
SPRINT="${SPRINT:-sprint5}"
DIR="${TOOLSHOP_DIR:-.toolshop}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Upstream compose + our overrides (per-service platforms, multi-arch nginx, no cron).
COMPOSE=(docker compose -p toolshop -f "$DIR/docker-compose.prod.yml" -f "$ROOT/docker/toolshop.override.yml")
export SPRINT DISABLE_LOGGING="${DISABLE_LOGGING:-true}"

wait_for() {
  local name="$1" url="$2" tries="${3:-90}"
  echo "Waiting for $name at $url ..."
  for _ in $(seq 1 "$tries"); do
    if curl -fs -o /dev/null "$url"; then echo "$name is up"; return 0; fi
    sleep 2
  done
  echo "::error::$name did not become ready at $url" >&2
  "${COMPOSE[@]}" logs --tail=80 || true
  return 1
}

clone() {
  if [ ! -d "$DIR/.git" ]; then
    git init -q "$DIR"
    git -C "$DIR" remote add origin https://github.com/testsmith-io/practice-software-testing.git
  fi
  git -C "$DIR" fetch -q --depth 1 origin "$TOOLSHOP_REF"
  git -C "$DIR" checkout -q FETCH_HEAD
}

seed() {
  # MariaDB may accept connections a few seconds after the container starts.
  local out
  for _ in $(seq 1 30); do
    if out=$("${COMPOSE[@]}" exec -T laravel-api php artisan migrate:fresh --seed --force 2>&1); then
      # Cached API responses would still point at the previous seed's ids.
      "${COMPOSE[@]}" exec -T laravel-api php artisan cache:clear > /dev/null
      echo "Database migrated, seeded and cache cleared"
      return 0
    fi
    echo "Database not ready yet, retrying..."; sleep 3
  done
  echo "$out" >&2
  return 1
}

images() {
  "${COMPOSE[@]}" config --images | sort -u
}

case "${1:-up}" in
  up)
    clone
    # nginx is built locally; skip the build when the image is already there (e.g. loaded from cache).
    BUILD=(--build)
    docker image inspect toolshop-web:local > /dev/null 2>&1 && BUILD=()
    "${COMPOSE[@]}" up -d "${BUILD[@]}" --quiet-pull
    seed
    wait_for "API" "http://localhost:8091/status"
    wait_for "UI" "http://localhost:4200"
    ;;
  seed) seed ;;
  logs) "${COMPOSE[@]}" logs --tail=200 ;;
  down) "${COMPOSE[@]}" down -v ;;
  save)
    FILE="${2:?usage: $0 save <file.tar>}"
    clone
    "${COMPOSE[@]}" pull --quiet --ignore-buildable
    "${COMPOSE[@]}" build --quiet
    # shellcheck disable=SC2207 # image references never contain spaces (bash 3.2 compatible on macOS)
    IMAGES=($(images))
    echo "Saving ${#IMAGES[@]} images to $FILE: ${IMAGES[*]}"
    docker save -o "$FILE" "${IMAGES[@]}"
    ;;
  load)
    FILE="${2:?usage: $0 load <file.tar>}"
    if [ -f "$FILE" ]; then docker load -q -i "$FILE"; else echo "No image archive at $FILE, images will be pulled."; fi
    ;;
  *) echo "Usage: $0 {up|seed|logs|down|save <file>|load <file>}" >&2; exit 2 ;;
esac
