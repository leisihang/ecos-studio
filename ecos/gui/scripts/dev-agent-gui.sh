#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GUI_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ECOS_DIR="$(cd "$GUI_DIR/.." && pwd)"
REPO_ROOT="$(cd "$ECOS_DIR/.." && pwd)"
WORKSPACE_ROOT="$(cd "$REPO_ROOT/.." && pwd)"

resolve_agent_bridge_root() {
  if [[ -n "${AGENT_BRIDGE_ROOT:-}" ]]; then
    realpath "$AGENT_BRIDGE_ROOT"
    return 0
  fi

  if [[ -n "${CODEX_AGENT_BRIDGE_ROOT:-}" ]]; then
    realpath "$CODEX_AGENT_BRIDGE_ROOT"
    return 0
  fi

  local candidates=(
    "$REPO_ROOT/external/agent-bridge"
    "$REPO_ROOT/external/codex-agent-bridge"
    "$REPO_ROOT/../agent-bridge"
    "$REPO_ROOT/../codex-agent-bridge"
    "$WORKSPACE_ROOT/agent-bridge"
    "$WORKSPACE_ROOT/codex-agent-bridge"
  )

  for candidate in "${candidates[@]}"; do
    if [[ -f "$candidate/src/AgentRuntime.js" ]]; then
      realpath "$candidate"
      return 0
    fi
  done

  cat >&2 <<'EOF'
ERROR: Unable to find agent bridge.

Set AGENT_BRIDGE_ROOT to the bridge checkout, or place it at one of:
  - ecos-studio/external/agent-bridge
  - ../agent-bridge or ../codex-agent-bridge next to ecos-studio
EOF
  exit 1
}

export AGENT_BRIDGE_ROOT="$(resolve_agent_bridge_root)"
export CODEX_AGENT_BRIDGE_ROOT="${CODEX_AGENT_BRIDGE_ROOT:-$AGENT_BRIDGE_ROOT}"

export COREPACK_HOME="${COREPACK_HOME:-/tmp/corepack}"
export PNPM_HOME="${PNPM_HOME:-/tmp/pnpm-home}"
export PNPM_STORE_PATH="${PNPM_STORE_PATH:-/tmp/pnpm-store}"
export XDG_DATA_HOME="${XDG_DATA_HOME:-/tmp/xdg-data}"
export XDG_STATE_HOME="${XDG_STATE_HOME:-/tmp/xdg-state}"

if [[ -n "${ECOS_AGENT_DEMO_TOOLS_BIN:-}" ]]; then
  export PATH="$ECOS_AGENT_DEMO_TOOLS_BIN:$PATH"
fi

echo "[agent-gui] AGENT_BRIDGE_ROOT=$AGENT_BRIDGE_ROOT"

cd "$GUI_DIR"
exec corepack pnpm --filter @ecos-studio/desktop-electron run dev
