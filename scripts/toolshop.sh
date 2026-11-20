#!/usr/bin/env bash
# Start/stop Practice Software Testing (Toolshop) locally with Docker, using the
# pre-built images published by testsmith-io. Used both on a laptop and in CI.
#
#   ./scripts/toolshop.sh up      # clone (pinned), start, seed, wait until healthy
#   ./scripts/toolshop.sh seed    # reset the database to the seeded state
#   ./scripts/toolshop.sh down    # stop and remove containers + volumes
set -euo pipefail

# Pin the upstream revision so the app (and therefore screenshots/budgets) never changes under our feet.
TOOLSHOP_REF="${TOOLSHOP_REF:-ae7caecb811dd8952c09d997e69be7cb946ecd44}"
SPRINT="${SPRINT:-sprint5}"
DIR="${TOOLSHOP_DIR:-.toolshop}"
COMPOSE=(docker compose -f "$DIR/docker-compose.prod.yml")
export SPRINT DISABLE_LOGGING="${DISABLE_LOGGING:-true}"
# Upstream images are published for linux/amd64 only. Declaring it avoids the platform warning
# on Apple Silicon (Docker runs them through emulation).
export DOCKER_DEFAULT_PLATFORM="${DOCKER_DEFAULT_PLATFORM:-linux/amd64}"

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
      echo "Database migrated and seeded"
      return 0
    fi
    echo "Database not ready yet, retrying..."; sleep 3
  done
  echo "$out" >&2
  return 1
}

case "${1:-up}" in
  up)
    clone
    "${COMPOSE[@]}" up -d --quiet-pull
    seed
    wait_for "API" "http://localhost:8091/status"
    wait_for "UI" "http://localhost:4200"
    ;;
  seed) seed ;;
  down) "${COMPOSE[@]}" down -v ;;
  *) echo "Usage: $0 {up|seed|down}" >&2; exit 2 ;;
esac
