#!/usr/bin/env bash
# Dongil service control for macOS: start | update | stop
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WEB_DIR="$ROOT/apps/web"
WEB_PORT=4173
API_HEALTH_URL="http://127.0.0.1:3000/api/docs"
WEB_LOG="${TMPDIR:-/tmp}/dongil-web.log"
cd "$ROOT"

say() { echo "[dongil] $*"; }
die() { echo "[dongil] ERROR: $*" >&2; exit 1; }

assert_config() {
  [ -f "$ROOT/.env" ] || die "Missing $ROOT/.env. Put JWT_ACCESS_SECRET and JWT_REFRESH_SECRET in it."
  [ -f "$WEB_DIR/.env.local" ] || die "Missing $WEB_DIR/.env.local. Put VITE_API_URL=https://<host>.<tailnet>.ts.net:8443/api/v1 in it."
}

web_pid() { lsof -nP -tiTCP:"$WEB_PORT" -sTCP:LISTEN 2>/dev/null | head -n 1 || true; }

stop_web() {
  local pid cwd
  pid="$(web_pid)"
  if [ -z "$pid" ]; then say "Web is not running."; return 0; fi
  cwd="$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p')"
  # Never kill something else that happens to hold the port.
  case "$cwd" in
    "$ROOT"*) ;;
    *) die "Port $WEB_PORT is used by another program (pid $pid, cwd $cwd)." ;;
  esac
  kill "$pid"
  while [ -n "$(web_pid)" ]; do sleep 0.3; done
  say "Web stopped."
}

build_web() {
  say "Building web..."
  (cd "$WEB_DIR" && pnpm build)
}

start_web() {
  if [ -n "$(web_pid)" ]; then say "Web is already running."; return 0; fi
  if [ ! -f "$WEB_DIR/dist/index.html" ]; then
    [ -d "$ROOT/node_modules" ] || pnpm install --frozen-lockfile
    build_web
  fi
  # Loopback only: Tailscale Serve proxies to it, so the LAN does not need it.
  (cd "$WEB_DIR" && nohup pnpm exec vite preview --host 127.0.0.1 --port "$WEB_PORT" --strictPort >"$WEB_LOG" 2>&1 &)
  say "Web starting..."
}

docker_ready() { docker info >/dev/null 2>&1; }

start_docker() {
  if docker_ready; then return 0; fi
  say "Starting Docker Desktop..."
  open -a Docker || die "Could not open Docker Desktop. Is it installed?"
  local i=0
  while [ "$i" -lt 90 ]; do
    if docker_ready; then return 0; fi
    sleep 2
    i=$((i + 1))
  done
  die "Docker Desktop did not become ready within 3 minutes."
}

wait_http() {
  local name="$1" url="$2" i=0
  while [ "$i" -lt 60 ]; do
    if curl -fsS -o /dev/null --max-time 3 "$url" 2>/dev/null; then
      say "$name is up: $url"
      return 0
    fi
    sleep 2
    i=$((i + 1))
  done
  return 1
}

wait_services() {
  wait_http "API" "$API_HEALTH_URL" || die "API did not respond within 2 minutes: $API_HEALTH_URL"
  wait_http "Web" "http://127.0.0.1:$WEB_PORT/" || die "Web did not respond within 2 minutes. See the log: $WEB_LOG"
}

assert_repo() {
  local branch dirty
  branch="$(git rev-parse --abbrev-ref HEAD)"
  [ "$branch" = "main" ] || die "Update runs on main only (current: $branch)."
  dirty="$(git status --porcelain --untracked-files=no)"
  [ -z "$dirty" ] || die "Local changes would be mixed in. Commit or discard them first:
$dirty"
}

case "${1:-}" in
  start)
    assert_config
    start_web
    start_docker
    docker compose --profile prod up -d
    wait_services
    ;;
  update)
    assert_config
    assert_repo
    start_docker
    say "Pulling..."
    git pull --ff-only origin main
    pnpm install --frozen-lockfile
    # Build first: if it fails, the running services are left untouched.
    build_web
    say "Rebuilding API (migrations run when the container starts)..."
    docker compose --profile prod up -d --build
    stop_web
    start_web
    wait_services
    say "Now at: $(git log --oneline -1)"
    ;;
  stop)
    stop_web
    if docker_ready; then
      docker compose --profile prod stop
    else
      say "Docker is not running, so there are no containers to stop."
    fi
    ;;
  *)
    die "Usage: dongil.sh start|update|stop"
    ;;
esac
say "$1 finished."
