#!/usr/bin/env bash
# Publish the World Showcase to the IANLAN datacenter host using key-only SSH.
set -euo pipefail

REPO_ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
SHOWCASE_DIR="$REPO_ROOT/world-showcase"
DEPLOY_HOST=${DATACENTER_HOST:-10.80.13.16}
DEPLOY_USER=${DATACENTER_USER:-ianwalmsley}
DEPLOY_KEY=${DATACENTER_KEY_PATH:-$REPO_ROOT/.deploy-keys/ianlan_datacenter_ed25519}
KNOWN_HOSTS=${DATACENTER_KNOWN_HOSTS:-$REPO_ROOT/.deploy-keys/known_hosts}
DEPLOY_DESTINATION=/srv/ianlan-nextgen

if [[ ! -f "$DEPLOY_KEY" || ! -f "$KNOWN_HOSTS" ]]; then
  echo "Datacenter SSH key or known-hosts file is missing; do not fall back to password authentication." >&2
  exit 1
fi

SSH_OPTIONS=(
  -i "$DEPLOY_KEY"
  -o BatchMode=yes
  -o StrictHostKeyChecking=yes
  -o UserKnownHostsFile="$KNOWN_HOSTS"
)

rsync -az --delete \
  --exclude node_modules \
  --exclude .next \
  --exclude .open-next \
  --exclude .wrangler \
  --exclude .sites-worker-bundle \
  --exclude .railwayignore \
  -e "ssh ${SSH_OPTIONS[*]}" \
  "$SHOWCASE_DIR/" "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_DESTINATION/"

ssh "${SSH_OPTIONS[@]}" "$DEPLOY_USER@$DEPLOY_HOST" \
  "cd '$DEPLOY_DESTINATION' && npm ci && npm run build && sudo systemctl restart ianlan-nextgen && for attempt in \$(seq 1 30); do if curl --fail --silent --show-error http://127.0.0.1/api/health; then exit 0; fi; sleep 2; done; exit 1"

echo "Datacenter deployment healthy: http://$DEPLOY_HOST"
