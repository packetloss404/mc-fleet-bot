#!/usr/bin/env bash
#
# codex-tmux.sh - attach to (or create) a persistent tmux session running
# Codex, so SSH drops never kill your session.
#
# Run this ONE command after you SSH in:
#     /opt/stacks/mc-fleet-bot/scripts/codex-tmux.sh
#
# - First run:  creates a tmux session named "codex" in the project dir and
#               launches `codex` inside it.
# - Later runs: re-attaches to that same session, right where you left off.
# - Losing SSH / closing the window just DETACHES you; nothing stops running.
#
set -euo pipefail

SESSION="${CODEX_TMUX_SESSION:-codex}"
WORKDIR="${CODEX_TMUX_WORKDIR:-/opt/stacks/mc-fleet-bot}"
CODEX_CMD="${CODEX_TMUX_CMD:-codex}"

# --- sanity checks ----------------------------------------------------------
if ! command -v tmux >/dev/null 2>&1; then
  echo "ERROR: tmux is not installed." >&2
  echo "Install it with:  sudo apt install tmux" >&2
  exit 1
fi

if ! command -v "${CODEX_CMD%% *}" >/dev/null 2>&1; then
  echo "WARNING: '${CODEX_CMD%% *}' not found on PATH." >&2
  echo "The tmux session will still start, but the command may fail inside it." >&2
fi

# --- create the session if it does not already exist ------------------------
# tmux new-session -d only creates when the session is absent; if it already
# exists this is a harmless no-op (guarded by has-session).
if ! tmux has-session -t "=$SESSION" 2>/dev/null; then
  echo "Creating tmux session '$SESSION' in $WORKDIR ..."
  tmux new-session -d -s "$SESSION" -c "$WORKDIR" "$CODEX_CMD"
else
  echo "Re-attaching to existing tmux session '$SESSION' ..."
fi

# --- attach (or switch, if we are already inside tmux) ----------------------
if [ -n "${TMUX:-}" ]; then
  # Already inside a tmux client: switch instead of nesting.
  tmux switch-client -t "=$SESSION"
else
  # Normal case: attach. This also gracefully handles the "attached
  # elsewhere" scenario -- attaching a second client just mirrors the
  # session; both stay live.
  exec tmux attach-session -t "=$SESSION"
fi
