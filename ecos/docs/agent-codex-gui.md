# Codex Agent GUI Usage

This document explains how to run the ECOS Studio fork with the external Agent
bridge and the Codex app-server provider.

Chinese version: [Codex Agent GUI 使用文档](agent-codex-gui.zh-CN.md).

The integration is intentionally split into two repositories:

- ECOS Studio keeps only the thin GUI, IPC, preload, and shared type layer.
- `codex-agent-bridge` owns Codex process management, provider adapters,
  session/turn handling, event normalization, and FlowGuard policy logic.

## Repository Branches

Use these two branches together:

```text
ECOS Studio GUI fork:
https://github.com/<your-github-owner>/ecos-studio/tree/checkpoint/codex-gui-working

External Agent bridge:
https://github.com/<your-github-owner>/codex-agent-bridge/tree/checkpoint/codex-agent-bridge-working
```

Recommended checkout layout:

```text
workspace/
  ecos-studio/
  codex-agent-bridge/
```

## Compatibility With Upstream Main

Most normal ECOS Studio setup requirements are inherited from upstream `main`.
The Agent integration is added on top of that baseline.

| Area | Upstream `main` | This fork branch |
| --- | --- | --- |
| Normal ECOS GUI | Same | Same |
| Project load/run flow | Uses ECC CLI | Uses ECC CLI |
| Agent chat panel | Not present | Present |
| `pnpm run dev` | Normal GUI | Normal GUI |
| `pnpm run dev:agent` | Not present | Starts GUI with external Agent bridge |
| Codex logic | Not present | Lives in external bridge |
| Real EDA execution | Requires real ECC/toolchain | Still requires real ECC/toolchain |

Important: installing Codex does not replace ECC. Codex chat and ECC flow
execution are two separate capabilities:

```text
Codex chat:
ECOS GUI -> agent:* IPC -> codex-agent-bridge -> codex app-server

ECOS flow:
ECOS GUI -> desktop runtime -> ecc workspace commands -> EDA tools/PDK
```

If Codex chat works, installing a real ECC CLI should not break chat. It only
enables real project loading and real flow execution instead of demo shims.

## Requirements

For Codex chat:

- Linux desktop environment with X11 or Wayland
- Node.js
- Corepack / pnpm
- Codex CLI installed and logged in
- `codex-agent-bridge` checkout

For normal ECOS project loading and real flow execution:

- initialized ECOS submodules
- working ECC CLI environment
- required ECOS/ECC native dependencies
- usable PDK/toolchain resources

Check Codex first:

```bash
codex --version
codex login
codex app-server --listen stdio://
```

If the last command starts successfully, stop it with `Ctrl+C`. ECOS Studio will
start the app-server itself through the bridge.

## Clone

SSH:

```bash
mkdir -p ~/ecos-agent-demo
cd ~/ecos-agent-demo
git clone -b checkpoint/codex-gui-working git@github.com:<your-github-owner>/ecos-studio.git
git clone -b checkpoint/codex-agent-bridge-working git@github.com:<your-github-owner>/codex-agent-bridge.git
```

HTTPS:

```bash
mkdir -p ~/ecos-agent-demo
cd ~/ecos-agent-demo
git clone -b checkpoint/codex-gui-working https://github.com/<your-github-owner>/ecos-studio.git
git clone -b checkpoint/codex-agent-bridge-working https://github.com/<your-github-owner>/codex-agent-bridge.git
```

## Install GUI Dependencies

From the GUI workspace:

```bash
cd ~/ecos-agent-demo/ecos-studio/ecos/gui
corepack pnpm install
```

If Electron download is slow in China:

```bash
cd ~/ecos-agent-demo/ecos-studio/ecos/gui
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ corepack pnpm install
```

If Corepack tries to write an unavailable home cache, use writable temporary
locations:

```bash
cd ~/ecos-agent-demo/ecos-studio/ecos/gui
COREPACK_HOME=/tmp/corepack PNPM_HOME=/tmp/pnpm-home PNPM_STORE_PATH=/tmp/pnpm-store XDG_DATA_HOME=/tmp/xdg-data XDG_STATE_HOME=/tmp/xdg-state corepack pnpm install
```

## Start ECOS Studio With The Agent Bridge

Use `AGENT_BRIDGE_ROOT` to point ECOS Studio to the external bridge:

```bash
cd ~/ecos-agent-demo/ecos-studio/ecos/gui
AGENT_BRIDGE_ROOT=~/ecos-agent-demo/codex-agent-bridge corepack pnpm run dev:agent
```

`dev:agent` resolves the bridge in this order:

1. `AGENT_BRIDGE_ROOT`
2. `CODEX_AGENT_BRIDGE_ROOT`
3. `ecos-studio/external/agent-bridge`
4. `ecos-studio/external/codex-agent-bridge`
5. a sibling `agent-bridge` or `codex-agent-bridge` checkout

Generic one-line startup command:

```bash
cd <workspace>/ecos-studio/ecos/gui && AGENT_BRIDGE_ROOT=<workspace>/codex-agent-bridge COREPACK_HOME=/tmp/corepack PNPM_HOME=/tmp/pnpm-home PNPM_STORE_PATH=/tmp/pnpm-store XDG_DATA_HOME=/tmp/xdg-data XDG_STATE_HOME=/tmp/xdg-state corepack pnpm run dev:agent
```

If you are using a demo-only `ecc` shim, add it explicitly:

```bash
cd <workspace>/ecos-studio/ecos/gui && AGENT_BRIDGE_ROOT=<workspace>/codex-agent-bridge ECOS_AGENT_DEMO_TOOLS_BIN=<workspace>/demo-tools/bin COREPACK_HOME=/tmp/corepack PNPM_HOME=/tmp/pnpm-home PNPM_STORE_PATH=/tmp/pnpm-store XDG_DATA_HOME=/tmp/xdg-data XDG_STATE_HOME=/tmp/xdg-state corepack pnpm run dev:agent
```

## Use The Agent Panel

1. Start ECOS Studio with `pnpm run dev:agent`.
2. Open or import an ECOS project.
3. Open the AI / Agent chat panel.
4. Send a prompt.
5. The panel streams assistant text and command/action blocks.
6. Use the stop button to interrupt a running turn.
7. Use the history button to load previous local Codex sessions.

The current default provider is:

```text
codex_app_server
```

The UI talks to the generic `window.ecosDesktop.agent` API. Codex-specific
logic is implemented in the external bridge.

## Opening A Project

Latest ECOS Studio `main` uses the ECC CLI for workspace commands. Opening an
existing project runs a command equivalent to:

```bash
ecc workspace load --directory /path/to/project --json
```

Therefore, opening a project requires one of these:

- a real working ECC CLI environment; or
- a demo-only ECC shim on `PATH` for Codex GUI smoke tests.

### Option A: Real ECC CLI

Use this path when you want normal ECOS behavior and real flow execution.

From the ECOS Studio repository:

```bash
cd ~/ecos-agent-demo/ecos-studio
make setup
cd ecc
uv sync --no-build-isolation-package ecc-dreamplace --no-build-isolation-package ecc-tools-bin --verbose
uv run ecc --version
```

If Nix is available, run `nix develop` inside `ecc` before `uv sync`. If Nix is
not available, run `uv sync` in the normal shell.

In development mode, ECOS Studio can fall back to `ecos/scripts/ecc-wrapper.sh`
when `ecc` is not directly on `PATH`. That wrapper runs `uv run ecc` inside the
`ecc` submodule. The submodule must be initialized and synced.

### Option B: Demo ECC Shim

Use this path only when the goal is to test the Codex GUI quickly without
installing the real ECC/toolchain stack.

This repository branch does not require demo shim code inside ECOS Studio. If
you use a demo shim, pass it explicitly through `ECOS_AGENT_DEMO_TOOLS_BIN`:

```text
ECOS_AGENT_DEMO_TOOLS_BIN=<workspace>/demo-tools/bin
```

For example:

```text
<workspace>/demo-tools/bin/ecc
```

The shim responds to basic commands such as:

```bash
ecc workspace load --directory /path/to/project --json
ecc workspace get-home --directory /path/to/project --json
ecc workspace get-info --directory /path/to/project --step Synthesis_yosys --id subflow --json
```

It is useful for opening the demo project and validating Codex chat. It does not
run real synthesis, floorplan, placement, routing, or DRC.

## Example Demo Project

Example Windows path:

```text
C:\path\to\demo-project
```

Example WSL path:

```text
/mnt/c/path/to/demo-project
```

This project is suitable for Agent GUI validation:

- open/import a project in ECOS Studio
- inspect existing ECOS flow files
- chat with Codex in the project working directory
- let Codex read and edit project files when sandbox/approval settings allow it

It is not proof that a real RTL-to-GDS flow is installed. Real flow execution
requires the real ECC CLI and underlying tools.

## Modes

The Agent panel exposes two modes:

```text
General assistant
Flow-guarded design
```

General assistant is normal Codex chat.

Flow-guarded design enables the prototype FlowGuard layer from the bridge. It
adds workflow-aware checks around agent actions, but it is not a replacement for
the real ECC state or a full production EDA scheduler.

## What Is Implemented

ECOS Studio fork:

- AI / Agent chat panel integration
- generic `agent:*` IPC handlers
- preload API at `window.ecosDesktop.agent`
- shared TypeScript contracts
- `dev:agent` startup helper
- renderer-side session list/resume UI
- turn interruption UI
- command/action block rendering

External bridge:

- starts `codex app-server --listen stdio://`
- initializes Codex app-server
- starts sessions and turns
- streams assistant and command events
- normalizes Codex events into generic Agent events
- supports session listing and resume
- supports turn interruption
- includes prototype FlowGuard mode

## What Is Not Implemented Yet

- full multi-provider UI selection
- production-quality provider plugin packaging
- full FlowGuard artifact versioning and rollback
- real automatic EDA quality gates
- guaranteed Chinese IME candidate-window behavior under every WSLg/Electron
  environment
- real physical-design execution without installing ECC/toolchain dependencies

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

## Verify ECOS GUI TypeScript

From the GUI workspace:

```bash
cd ~/ecos-agent-demo/ecos-studio/ecos/gui
COREPACK_HOME=/tmp/corepack PNPM_HOME=/tmp/pnpm-home PNPM_STORE_PATH=/tmp/pnpm-store XDG_DATA_HOME=/tmp/xdg-data XDG_STATE_HOME=/tmp/xdg-state corepack pnpm --filter @ecos-studio/desktop-electron run typecheck
COREPACK_HOME=/tmp/corepack PNPM_HOME=/tmp/pnpm-home PNPM_STORE_PATH=/tmp/pnpm-store XDG_DATA_HOME=/tmp/xdg-data XDG_STATE_HOME=/tmp/xdg-state corepack pnpm --filter @ecos-studio/renderer run typecheck
COREPACK_HOME=/tmp/corepack PNPM_HOME=/tmp/pnpm-home PNPM_STORE_PATH=/tmp/pnpm-store XDG_DATA_HOME=/tmp/xdg-data XDG_STATE_HOME=/tmp/xdg-state corepack pnpm --filter @ecos-studio/desktop-electron exec vitest run electron/main/registerIpc.test.ts --pool threads
```

## Troubleshooting

### `pnpm: command not found`

Use Corepack:

```bash
corepack pnpm --version
corepack pnpm install
```

If a script internally calls `pnpm`, run through the repository script such as
`corepack pnpm run dev:agent` instead of invoking a nested package script
directly.

### Corepack cache errors

If Corepack reports an error under `~/.cache/node/corepack`, use writable cache
directories:

```bash
COREPACK_HOME=/tmp/corepack PNPM_HOME=/tmp/pnpm-home PNPM_STORE_PATH=/tmp/pnpm-store XDG_DATA_HOME=/tmp/xdg-data XDG_STATE_HOME=/tmp/xdg-state corepack pnpm install
```

### Electron dependency download is slow

Use an Electron mirror:

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ corepack pnpm install
```

### Electron starts but no window appears

Confirm that Linux has a graphical environment:

```bash
echo $DISPLAY
echo $WAYLAND_DISPLAY
```

In WSL, run from a WSLg-capable environment. Headless Linux sessions cannot show
the Electron window.

### Missing Electron native libraries

On Ubuntu 24.04, these packages fixed common Electron startup failures:

```bash
sudo apt-get install -y libnspr4 libnss3 libasound2t64
```

Other distributions may need the equivalent Electron/Chromium runtime
libraries.

### `Failed to spawn: 'ecc'`

This means ECOS Studio tried to open a project but no `ecc` executable was
available to the Electron process.

For a real ECOS environment:

```bash
cd ~/ecos-agent-demo/ecos-studio
make setup
cd ecc
uv sync --no-build-isolation-package ecc-dreamplace --no-build-isolation-package ecc-tools-bin --verbose
uv run ecc --version
```

For a Codex GUI smoke test only, put a demo `ecc` shim on `PATH`, for example
`<workspace>/demo-tools/bin/ecc`.

### `ecc` submodule is empty

Check:

```bash
cd ~/ecos-agent-demo/ecos-studio
git submodule status --recursive
```

If the `ecc` line starts with `-`, it is not initialized. Run:

```bash
git submodule update --init --recursive
```

### `ModuleNotFoundError: No module named 'uvicorn'`

This was seen on older pre-rebase builds that started the ECOS FastAPI backend
directly. Latest `checkpoint/codex-gui-working` follows upstream `main` and uses
the ECC CLI path for workspace commands.

If you are intentionally running an older commit, prepare its Python server
environment before launching the GUI.

### GUI cannot find the bridge

Check:

```bash
echo $AGENT_BRIDGE_ROOT
ls "$AGENT_BRIDGE_ROOT/src/AgentRuntime.js"
```

Then start from `ecos/gui`:

```bash
AGENT_BRIDGE_ROOT=/path/to/codex-agent-bridge corepack pnpm run dev:agent
```

### Codex does not respond

Check:

```bash
codex --version
codex login
codex app-server --listen stdio://
```

Stop the manual app-server process with `Ctrl+C` before starting ECOS Studio.

### `thread/start response did not include thread.id`

Newer Codex app-server versions return the thread id at `thread.id`. The bridge
handles this response shape. If this error appears, update both repositories to
the documented branches.

### Chinese input issues in the Electron chat box

The chat input accepts Unicode text, and pasted Chinese text should work. IME
preedit and candidate-window rendering is controlled by the Linux desktop,
Electron, WSLg, and input-method framework. If typed Chinese does not show the
candidate list, verify the host IME configuration separately from the Agent
bridge.

Known environment variables to try with fcitx5/ibus setups include:

```bash
GTK_IM_MODULE=fcitx QT_IM_MODULE=fcitx XMODIFIERS=@im=fcitx ELECTRON_OZONE_PLATFORM_HINT=x11
```

This is an environment issue, not a Codex app-server issue.

## Development Boundary

Keep ECOS Studio thin:

- GUI components
- generic `agent:*` IPC handlers
- preload bridge
- shared TypeScript contracts
- development script that points to the external bridge

Keep provider and workflow logic in the bridge:

- agent process management
- provider adapters
- event normalization
- session mapping
- approval handling
- FlowGuard / workflow policy logic

When adding another CLI or RPC agent, add it as a provider in
`codex-agent-bridge` rather than placing provider-specific runtime logic inside
ECOS Studio.

## Recommended Commit Discipline

For collaboration with upstream ECOS Studio:

- rebase the fork branch on upstream `main` regularly
- keep ECOS Studio changes limited to the thin Agent GUI/IPC layer
- keep Codex/provider-specific behavior in `codex-agent-bridge`
- document local demo shims as test-only tooling
- verify normal ECOS GUI typecheck/tests after bridge-related changes
