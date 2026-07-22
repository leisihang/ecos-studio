# Codex Agent GUI 使用文档

本文档说明如何运行带 Codex Agent 面板的 ECOS Studio fork，以及如何配合外部
`codex-agent-bridge` 使用 Codex app-server。

这套集成刻意拆成两个仓库：

- ECOS Studio 只保留很薄的一层：GUI、IPC、preload API、共享类型和启动脚本。
- `codex-agent-bridge` 负责 Codex 进程管理、provider 适配、session/turn 管理、
  事件归一化和 FlowGuard 策略逻辑。

英文版文档见：[Codex Agent GUI Usage](agent-codex-gui.md)。

## 相关分支

需要同时使用下面两个分支：

```text
ECOS Studio GUI fork:
https://github.com/<your-github-owner>/ecos-studio/tree/checkpoint/codex-gui-working

外部 Agent bridge:
https://github.com/<your-github-owner>/codex-agent-bridge/tree/checkpoint/codex-agent-bridge-working
```

推荐目录结构：

```text
workspace/
  ecos-studio/
  codex-agent-bridge/
```

## 和 upstream main 的关系

普通 ECOS Studio 的安装、构建、打开项目和运行 flow 逻辑继承自 upstream
`main`。本 fork 在这个基础上增加 Agent/Codex 面板。

| 内容 | upstream `main` | 当前 fork 分支 |
| --- | --- | --- |
| 普通 ECOS GUI | 一致 | 一致 |
| 打开项目/运行 flow | 使用 ECC CLI | 使用 ECC CLI |
| Agent 聊天面板 | 没有 | 有 |
| `pnpm run dev` | 普通 GUI | 普通 GUI |
| `pnpm run dev:agent` | 没有 | 启动 GUI 并连接外部 Agent bridge |
| Codex 逻辑 | 没有 | 在外部 bridge 仓库 |
| 真实 EDA 执行 | 需要真实 ECC/toolchain | 仍然需要真实 ECC/toolchain |

要特别区分两条链路：

```text
Codex 对话链路：
ECOS GUI -> agent:* IPC -> codex-agent-bridge -> codex app-server

ECOS flow 链路：
ECOS GUI -> desktop runtime -> ecc workspace commands -> EDA tools/PDK
```

所以，Codex 能对话不代表真实 ECC flow 已经安装；安装真实 ECC CLI 也不会破坏
Codex 对话链路，它只是让 ECOS 可以真实打开/运行项目。

## 当前实现状态

这个分支的主线是 ECOS Studio GUI 集成：

- ECOS Studio 提供 AI / Agent 面板、通用 `agent:*` IPC handlers、preload API、
  共享 Agent contract，以及 `dev:agent` 启动脚本。
- `codex-agent-bridge` 保持在 ECOS Studio 源码树之外，负责 Codex app-server
  进程管理、provider 适配、session/turn 管理、事件归一化和 guard 策略逻辑。
- ECOS workspace 打开和 flow 执行仍然使用 ECC CLI。Agent bridge 不替代 `ecc`。
- bridge 可以通过 runtime 和 FlowGuard 验证脚本在 headless 环境中验证；Electron
  Agent 面板最终仍需要真实图形环境做可视化验证。
- `codex-agent-bridge` 中目前有一个 DSE/FSM 原型，已验证的是 bridge 直接调用
  OpenROAD Docker。它还没有迁移成通过 ECC CLI 作为 DSE 后端。

后续目标链路是：

```text
ECOS Agent GUI
  -> codex-agent-bridge
  -> ECC CLI adapter
  -> ecc workspace run-step / run-flow
  -> ECC 选择的 EDA 后端
```

## 环境要求

Codex 对话需要：

- Linux 图形环境，X11 或 Wayland
- Node.js
- Corepack / pnpm
- Codex CLI 已安装并登录
- `codex-agent-bridge` 仓库

正常打开 ECOS 项目和运行真实 flow 还需要：

- ECOS 子模块已初始化
- ECC CLI 环境可用
- ECOS/ECC 所需 native 依赖
- 可用的 PDK 和工具链资源

先检查 Codex：

```bash
codex --version
codex login
codex app-server --listen stdio://
```

如果最后一条命令能启动，说明 Codex app-server 可用。确认后用 `Ctrl+C`
停止它，ECOS Studio 会通过 bridge 自己启动 app-server。

## 拉取仓库

SSH：

```bash
mkdir -p ~/ecos-agent-demo
cd ~/ecos-agent-demo
git clone -b checkpoint/codex-gui-working git@github.com:<your-github-owner>/ecos-studio.git
git clone -b checkpoint/codex-agent-bridge-working git@github.com:<your-github-owner>/codex-agent-bridge.git
```

HTTPS：

```bash
mkdir -p ~/ecos-agent-demo
cd ~/ecos-agent-demo
git clone -b checkpoint/codex-gui-working https://github.com/<your-github-owner>/ecos-studio.git
git clone -b checkpoint/codex-agent-bridge-working https://github.com/<your-github-owner>/codex-agent-bridge.git
```

## 安装 GUI 依赖

进入 GUI 目录：

```bash
cd ~/ecos-agent-demo/ecos-studio/ecos/gui
corepack pnpm install
```

如果 Electron 下载慢：

```bash
cd ~/ecos-agent-demo/ecos-studio/ecos/gui
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ corepack pnpm install
```

如果 Corepack 想写不可用的 home cache，可以使用 `/tmp` 下的可写目录：

```bash
cd ~/ecos-agent-demo/ecos-studio/ecos/gui
COREPACK_HOME=/tmp/corepack PNPM_HOME=/tmp/pnpm-home PNPM_STORE_PATH=/tmp/pnpm-store XDG_DATA_HOME=/tmp/xdg-data XDG_STATE_HOME=/tmp/xdg-state corepack pnpm install
```

## 启动带 Agent 的 ECOS Studio

用 `AGENT_BRIDGE_ROOT` 指向外部 bridge：

```bash
cd ~/ecos-agent-demo/ecos-studio/ecos/gui
AGENT_BRIDGE_ROOT=~/ecos-agent-demo/codex-agent-bridge corepack pnpm run dev:agent
```

`dev:agent` 查找 bridge 的顺序是：

1. `AGENT_BRIDGE_ROOT`
2. `CODEX_AGENT_BRIDGE_ROOT`
3. `ecos-studio/external/agent-bridge`
4. `ecos-studio/external/codex-agent-bridge`
5. 和 `ecos-studio` 平级的 `agent-bridge` 或 `codex-agent-bridge`

通用一行启动命令：

```bash
cd <workspace>/ecos-studio/ecos/gui && AGENT_BRIDGE_ROOT=<workspace>/codex-agent-bridge COREPACK_HOME=/tmp/corepack PNPM_HOME=/tmp/pnpm-home PNPM_STORE_PATH=/tmp/pnpm-store XDG_DATA_HOME=/tmp/xdg-data XDG_STATE_HOME=/tmp/xdg-state corepack pnpm run dev:agent
```

如果使用 demo `ecc` shim，需要显式加上：

```bash
cd <workspace>/ecos-studio/ecos/gui && AGENT_BRIDGE_ROOT=<workspace>/codex-agent-bridge ECOS_AGENT_DEMO_TOOLS_BIN=<workspace>/demo-tools/bin COREPACK_HOME=/tmp/corepack PNPM_HOME=/tmp/pnpm-home PNPM_STORE_PATH=/tmp/pnpm-store XDG_DATA_HOME=/tmp/xdg-data XDG_STATE_HOME=/tmp/xdg-state corepack pnpm run dev:agent
```

## 使用 Agent 面板

1. 使用 `pnpm run dev:agent` 启动 ECOS Studio。
2. 打开或导入 ECOS project。
3. 打开 AI / Agent 聊天面板。
4. 输入 prompt 并发送。
5. 面板会流式显示 assistant 回复和命令/action block。
6. 运行中可以用 stop 按钮中断当前 turn。
7. 可以用 history 按钮加载本地已有 Codex session。

当前默认 provider 是：

```text
codex_app_server
```

前端使用通用的 `window.ecosDesktop.agent` API。Codex 专用逻辑在外部
`codex-agent-bridge` 中实现。

## 打开项目

最新 ECOS Studio `main` 已经使用 ECC CLI 处理 workspace 命令。打开已有
project 时会执行类似命令：

```bash
ecc workspace load --directory /path/to/project --json
```

因此打开项目需要满足下面两种情况之一：

- 安装真实可用的 ECC CLI 环境；或
- 只为了 Codex GUI smoke test，在 `PATH` 里放一个 demo 用 `ecc` shim。

### 方案 A：真实 ECC CLI

如果要验证 ECOS 原有功能和真实 flow，应该走这条路径。

在 ECOS Studio 仓库中执行：

```bash
cd ~/ecos-agent-demo/ecos-studio
make setup
cd ecc
uv sync --no-build-isolation-package ecc-dreamplace --no-build-isolation-package ecc-tools-bin --verbose
uv run ecc --version
```

如果有 Nix，可以先在 `ecc` 目录执行 `nix develop`，再运行 `uv sync`。
如果没有 Nix，就直接在普通 shell 中运行 `uv sync`。

开发模式下，如果 `PATH` 里没有 `ecc`，ECOS Studio 会尝试 fallback 到
`ecos/scripts/ecc-wrapper.sh`。这个 wrapper 会进入 `ecc` 子模块并执行
`uv run ecc`，所以 `ecc` 子模块必须已经初始化并完成依赖同步。

### 方案 B：demo ECC shim

如果目标只是快速看 Codex GUI、打开 demo project、验证能和 Codex 对话，可以
临时使用 demo `ecc` shim。

这个 shim 不放在 ECOS Studio 源码中。如果需要使用 demo shim，请通过
`ECOS_AGENT_DEMO_TOOLS_BIN` 显式传入：

```text
ECOS_AGENT_DEMO_TOOLS_BIN=<workspace>/demo-tools/bin
```

例如：

```text
<workspace>/demo-tools/bin/ecc
```

它支持基本命令，例如：

```bash
ecc workspace load --directory /path/to/project --json
ecc workspace get-home --directory /path/to/project --json
ecc workspace get-info --directory /path/to/project --step Synthesis_yosys --id subflow --json
```

它只能用于打开 demo project 和验证 Codex 聊天，不会运行真实 synthesis、
floorplan、placement、routing 或 DRC。

## 示例 demo project

示例 Windows 路径：

```text
C:\path\to\demo-project
```

示例 WSL 路径：

```text
/mnt/c/path/to/demo-project
```

这个项目适合做 Agent GUI 验证：

- 在 ECOS Studio 中打开/导入项目
- 查看已有 ECOS flow 文件
- 在项目 cwd 下和 Codex 对话
- 在 sandbox/approval 允许时，让 Codex 读写项目文件

但它不证明真实 RTL-to-GDS flow 已经安装。真实 flow 仍然需要真实 ECC CLI 和
底层工具链。

## 模式说明

Agent 面板目前有两个模式：

```text
General assistant
Flow-guarded design
```

General assistant 是普通 Codex 对话模式。

Flow-guarded design 会启用 bridge 中的 FlowGuard 原型层，对 agent action 加
一些 workflow-aware 检查。但它不是完整生产级 EDA scheduler，也不能替代真实
ECC 状态。

## 已实现内容

ECOS Studio fork 中包括：

- AI / Agent 聊天面板集成
- 通用 `agent:*` IPC handlers
- preload API：`window.ecosDesktop.agent`
- shared TypeScript contracts
- `dev:agent` 启动脚本
- renderer 侧 session list/resume UI
- turn interrupt UI
- 命令/action block 展示

外部 bridge 中包括：

- 启动 `codex app-server --listen stdio://`
- initialize Codex app-server
- 创建 session/thread 和 turn
- 流式接收 assistant 与 command events
- 将 Codex events 归一化为通用 Agent events
- session list/resume
- turn interrupt
- FlowGuard 原型模式

## 暂未实现内容

- 完整的多 provider UI 选择
- 生产级 provider plugin packaging
- 完整 FlowGuard artifact versioning 和 rollback
- 自动 EDA quality gate
- 在所有 WSLg/Electron 环境中稳定显示中文输入法候选框
- 不安装 ECC/toolchain 时运行真实物理设计流程

## 单独验证 bridge

在 bridge 仓库中：

```bash
cd ~/ecos-agent-demo/codex-agent-bridge
npm run verify:agent-runtime
npm run verify:flow-guard
npm run verify:manager-flow-guard
```

Codex standalone demo：

```bash
npm run probe
npm run demo
npm run demo:multi
```

## 验证 ECOS GUI TypeScript

在 GUI 目录中：

```bash
cd ~/ecos-agent-demo/ecos-studio/ecos/gui
COREPACK_HOME=/tmp/corepack PNPM_HOME=/tmp/pnpm-home PNPM_STORE_PATH=/tmp/pnpm-store XDG_DATA_HOME=/tmp/xdg-data XDG_STATE_HOME=/tmp/xdg-state corepack pnpm --filter @ecos-studio/desktop-electron run typecheck
COREPACK_HOME=/tmp/corepack PNPM_HOME=/tmp/pnpm-home PNPM_STORE_PATH=/tmp/pnpm-store XDG_DATA_HOME=/tmp/xdg-data XDG_STATE_HOME=/tmp/xdg-state corepack pnpm --filter @ecos-studio/renderer run typecheck
COREPACK_HOME=/tmp/corepack PNPM_HOME=/tmp/pnpm-home PNPM_STORE_PATH=/tmp/pnpm-store XDG_DATA_HOME=/tmp/xdg-data XDG_STATE_HOME=/tmp/xdg-state corepack pnpm --filter @ecos-studio/desktop-electron exec vitest run electron/main/registerIpc.test.ts --pool threads
```

## 常见问题

### `pnpm: command not found`

使用 Corepack：

```bash
corepack pnpm --version
corepack pnpm install
```

如果脚本内部还会调用 `pnpm`，优先从仓库脚本入口启动，例如
`corepack pnpm run dev:agent`。

### Corepack cache 报错

如果 Corepack 报 `~/.cache/node/corepack` 相关错误，使用可写目录：

```bash
COREPACK_HOME=/tmp/corepack PNPM_HOME=/tmp/pnpm-home PNPM_STORE_PATH=/tmp/pnpm-store XDG_DATA_HOME=/tmp/xdg-data XDG_STATE_HOME=/tmp/xdg-state corepack pnpm install
```

### Electron 下载慢

使用镜像：

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ corepack pnpm install
```

### Electron 启动但没有窗口

确认有图形环境：

```bash
echo $DISPLAY
echo $WAYLAND_DISPLAY
```

WSL 下需要 WSLg。纯 headless Linux 不能显示 Electron 窗口。

### 缺少 Electron native libraries

Ubuntu 24.04 下，这些包解决过常见 Electron 启动问题：

```bash
sudo apt-get install -y libnspr4 libnss3 libasound2t64
```

其他发行版需要安装对应 Chromium/Electron runtime libraries。

### `Failed to spawn: 'ecc'`

含义是 ECOS Studio 打开项目时找不到 `ecc` 可执行文件。

真实 ECOS 环境需要：

```bash
cd ~/ecos-agent-demo/ecos-studio
make setup
cd ecc
uv sync --no-build-isolation-package ecc-dreamplace --no-build-isolation-package ecc-tools-bin --verbose
uv run ecc --version
```

如果只是 Codex GUI smoke test，可以使用 demo `ecc` shim，例如：

```text
<workspace>/demo-tools/bin/ecc
```

### `ecc` 子模块是空的

检查：

```bash
cd ~/ecos-agent-demo/ecos-studio
git submodule status --recursive
```

如果 `ecc` 前面是 `-`，说明子模块没有初始化。执行：

```bash
git submodule update --init --recursive
```

### `ModuleNotFoundError: No module named 'uvicorn'`

这是旧版 pre-rebase GUI 路径中出现过的问题，当时 Electron 会启动 ECOS
FastAPI backend。当前 `checkpoint/codex-gui-working` 已经跟随 upstream
`main`，workspace 命令走 ECC CLI。

如果你刻意运行旧 commit，需要先准备旧版 Python server 环境。

### GUI 找不到 bridge

检查：

```bash
echo $AGENT_BRIDGE_ROOT
ls "$AGENT_BRIDGE_ROOT/src/AgentRuntime.js"
```

从 `ecos/gui` 启动：

```bash
AGENT_BRIDGE_ROOT=/path/to/codex-agent-bridge corepack pnpm run dev:agent
```

### Codex 没有响应

检查：

```bash
codex --version
codex login
codex app-server --listen stdio://
```

手动启动的 app-server 确认可用后，用 `Ctrl+C` 停掉，再启动 ECOS Studio。

### `thread/start response did not include thread.id`

新版 Codex app-server 会把 thread id 放在 `thread.id`。bridge 已经兼容这个
响应格式。如果还遇到这个错误，请更新两个仓库到本文档指定分支。

### 中文输入问题

聊天输入框可以显示 Unicode，复制粘贴中文应该可用。中文输入法的预编辑框和候选词
窗口由 Linux 桌面环境、Electron、WSLg 和输入法框架共同决定。

如果能粘贴中文但看不到候选词列表，优先检查系统输入法环境，而不是 Codex
app-server。

fcitx5/ibus 环境可以尝试：

```bash
GTK_IM_MODULE=fcitx QT_IM_MODULE=fcitx XMODIFIERS=@im=fcitx ELECTRON_OZONE_PLATFORM_HINT=x11
```

这类问题属于运行环境问题，不属于 bridge 协议问题。

## 开发边界

ECOS Studio 应保持很薄：

- GUI components
- 通用 `agent:*` IPC handlers
- preload bridge
- shared TypeScript contracts
- 指向外部 bridge 的开发启动脚本

provider 和 workflow 逻辑应留在 bridge 中：

- agent process management
- provider adapters
- event normalization
- session mapping
- approval handling
- FlowGuard / workflow policy logic

如果以后接入另一个 CLI 或 RPC agent，优先在 `codex-agent-bridge` 中新增
provider，不要把 provider-specific runtime 逻辑放进 ECOS Studio。

## 协作建议

为了方便和 upstream ECOS Studio 同步：

- 定期把 fork 分支 rebase 到 upstream `main`
- ECOS Studio 改动限制在薄 Agent GUI/IPC 层
- Codex/provider 专用逻辑留在 `codex-agent-bridge`
- demo shim 明确标注为测试工具
- bridge 相关变更后，验证 ECOS GUI typecheck/tests
