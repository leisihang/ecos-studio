# Codex Agent GUI Usage

This branch adds an Agent panel to ECOS Studio. The GUI stays thin: ECOS Studio
only provides the panel, IPC bridge, preload API, and TypeScript contracts. The
agent runtime lives in a separate bridge repository.

## Repositories

Use these two repositories together:

```text
ECOS Studio GUI:
https://github.com/leisihang/ecos-studio/tree/checkpoint/codex-gui-working

Agent bridge:
https://github.com/leisihang/codex-agent-bridge/tree/checkpoint/codex-agent-bridge-working
```

Recommended checkout layout:

```text
workspace/
  ecos-studio/
  codex-agent-bridge/
```

## Requirements

- Linux desktop environment with X11 or Wayland
- Node.js
- Corepack / pnpm
- Codex CLI installed and logged in

Check Codex first:

```bash
codex --version
codex login
codex app-server --listen stdio://
```

If the last command starts successfully, stop it with `Ctrl+C`. ECOS Studio will
start the app-server itself through the bridge.

## Clone

```bash
mkdir -p ~/ecos-agent-demo
cd ~/ecos-agent-demo
git clone -b checkpoint/codex-gui-working git@github.com:leisihang/ecos-studio.git
git clone -b checkpoint/codex-agent-bridge-working git@github.com:leisihang/codex-agent-bridge.git
```

HTTPS also works:

```bash
git clone -b checkpoint/codex-gui-working https://github.com/leisihang/ecos-studio.git
git clone -b checkpoint/codex-agent-bridge-working https://github.com/leisihang/codex-agent-bridge.git
```

## Install GUI Dependencies

From the GUI workspace:

```bash
cd ~/ecos-agent-demo/ecos-studio/ecos/gui
corepack pnpm install
```

If Electron download is slow in China:

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ corepack pnpm install
```

## Prepare The ECOS Backend

The Agent panel is part of the ECOS Studio desktop app. Starting the desktop app
also starts the local ECOS FastAPI backend, so the normal ECOS backend
dependencies must be installed once.

From the ECOS Studio repository:

```bash
cd ~/ecos-agent-demo/ecos-studio
make setup
cd ecc
uv sync --no-build-isolation-package ecc-dreamplace --no-build-isolation-package ecc-tools-bin --verbose
```

If Nix is available, run `nix develop` inside `ecc` before the `uv sync`
command. If Nix is not available, use the normal shell.

If the GUI exits with `ModuleNotFoundError: No module named 'uvicorn'`, the ECOS
backend Python environment is not ready yet. Run the ECOS setup commands above,
then start the GUI again.

## Start ECOS Studio With Codex Agent

Use `AGENT_BRIDGE_ROOT` to point ECOS Studio to the external bridge:

```bash
cd ~/ecos-agent-demo/ecos-studio/ecos/gui
AGENT_BRIDGE_ROOT=~/ecos-agent-demo/codex-agent-bridge corepack pnpm run dev:agent
```

For this local workspace, the equivalent command is:

```bash
cd /mnt/c/Users/26086/Desktop/least_ecos/ecos-studio/ecos/gui && AGENT_BRIDGE_ROOT=/mnt/c/Users/26086/Desktop/least_ecos/codex-agent-bridge COREPACK_HOME=/tmp/corepack PNPM_HOME=/tmp/pnpm-home PNPM_STORE_PATH=/tmp/pnpm-store XDG_DATA_HOME=/tmp/xdg-data XDG_STATE_HOME=/tmp/xdg-state corepack pnpm run dev:agent
```

## Use The Agent Panel

1. Start ECOS Studio with `pnpm run dev:agent`.
2. Open or import an ECOS project.
3. Open the AI / Agent chat panel.
4. Send a prompt.
5. The panel streams assistant text and shows command/action blocks.
6. Use the stop button to interrupt a running turn.
7. Use the history button to load previous local Codex sessions.

The current default provider is Codex app-server:

```text
codex_app_server
```

The UI talks to the generic `window.ecosDesktop.agent` API. Provider-specific
Codex logic is implemented in the external bridge.

## Modes

The panel exposes two modes:

```text
General assistant
Flow-guarded design
```

General assistant is the normal Codex chat mode.

Flow-guarded design enables the prototype FlowGuard state machine from the
bridge. It is intended to constrain ECOS-style flow actions, but the real EDA
steps still depend on the local ECOS/toolchain environment.

## Verify The Bridge Alone

From the bridge repository:

```bash
cd ~/ecos-agent-demo/codex-agent-bridge
npm run verify:agent-runtime
npm run verify:flow-guard
npm run verify:manager-flow-guard
```

Standalone Codex demos:

```bash
npm run probe
npm run demo
npm run demo:multi
```

## Troubleshooting

If the GUI cannot find the bridge, check:

```bash
echo $AGENT_BRIDGE_ROOT
ls "$AGENT_BRIDGE_ROOT/src/AgentRuntime.js"
```

If Codex does not respond, check:

```bash
codex --version
codex login
codex app-server --listen stdio://
```

If Electron fails to start on Linux, confirm that a graphical environment is
available:

```bash
echo $DISPLAY
echo $WAYLAND_DISPLAY
```

If native dependencies are rebuilt, such as `node-pty`, make sure Python and a C++
build toolchain are available.

## Boundary

ECOS Studio contains:

- Agent chat UI
- `agent:*` IPC handlers
- preload exposure through `window.ecosDesktop.agent`
- shared Agent TypeScript contracts
- `dev:agent` startup helper

The bridge contains:

- Codex app-server process management
- provider registry
- event normalization
- session and turn management
- FlowGuard policy logic

When adding another CLI or RPC agent, add it as a provider in the bridge rather
than placing provider-specific logic into ECOS Studio.
