import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type {
  DesktopAgentEvent,
  DesktopAgentListSessionsRequest,
  DesktopAgentListSessionsResponse,
  DesktopAgentProviderId,
  DesktopAgentProviderRequest,
  DesktopAgentResumeSessionRequest,
  DesktopAgentResumeSessionResponse,
  DesktopAgentSendMessageRequest,
  DesktopAgentSendMessageResponse,
  DesktopAgentSetModeRequest,
  DesktopAgentStartRequest,
  DesktopAgentStartSessionRequest,
  DesktopAgentStartSessionResponse,
  DesktopAgentStatus,
} from '@ecos-studio/shared'
import { electronLogger } from './logger'

interface ExternalAgentRuntime {
  getStatus(): DesktopAgentStatus
  interrupt(request?: DesktopAgentProviderRequest): Promise<void>
  listSessions(request: DesktopAgentListSessionsRequest): Promise<DesktopAgentListSessionsResponse>
  onEvent(listener: (event: DesktopAgentEvent) => void): () => void
  resumeSession(
    request: DesktopAgentResumeSessionRequest,
  ): Promise<DesktopAgentResumeSessionResponse>
  sendMessage(request: DesktopAgentSendMessageRequest): Promise<DesktopAgentSendMessageResponse>
  setMode(request: DesktopAgentSetModeRequest): Promise<DesktopAgentStatus>
  start(request?: DesktopAgentStartRequest): Promise<void>
  startSession(
    request: DesktopAgentStartSessionRequest,
  ): Promise<DesktopAgentStartSessionResponse>
  stop(request?: DesktopAgentProviderRequest): void
}

type ExternalAgentRuntimeConstructor = new (options?: unknown) => ExternalAgentRuntime

const DEFAULT_AGENT_PROVIDER: DesktopAgentProviderId = 'codex_app_server'
const AGENT_RUNTIME_ENTRY = path.join('src', 'AgentRuntime.js')

function getBridgeRoot(): string {
  if (process.env.AGENT_BRIDGE_ROOT) {
    return process.env.AGENT_BRIDGE_ROOT
  }

  if (process.env.CODEX_AGENT_BRIDGE_ROOT) {
    return process.env.CODEX_AGENT_BRIDGE_ROOT
  }

  let current = process.cwd()
  for (let depth = 0; depth < 8; depth += 1) {
    const candidates = [
      path.join(current, 'external', 'agent-bridge'),
      path.join(current, 'external', 'codex-agent-bridge'),
      path.join(current, 'agent-bridge'),
      path.join(current, 'codex-agent-bridge'),
    ]
    for (const candidate of candidates) {
      if (fs.existsSync(path.join(candidate, AGENT_RUNTIME_ENTRY))) {
        return candidate
      }
    }
    const parent = path.dirname(current)
    if (parent === current) break
    current = parent
  }

  return path.resolve(process.cwd(), '..', '..', '..', 'codex-agent-bridge')
}

async function loadRuntimeConstructor(): Promise<ExternalAgentRuntimeConstructor> {
  const bridgePath = path.resolve(getBridgeRoot(), AGENT_RUNTIME_ENTRY)
  const module = await import(pathToFileURL(bridgePath).href)
  const Constructor = (module as { AgentRuntime?: unknown }).AgentRuntime
  if (typeof Constructor !== 'function') {
    throw new Error(`Agent bridge module did not export AgentRuntime: ${bridgePath}`)
  }
  return Constructor as ExternalAgentRuntimeConstructor
}

export class AgentRuntimeService {
  private readonly runtimes = new Map<DesktopAgentProviderId, ExternalAgentRuntime>()
  private runtimeConstructor: ExternalAgentRuntimeConstructor | null = null
  private readonly listeners = new Set<(event: DesktopAgentEvent) => void>()

  onEvent(listener: (event: DesktopAgentEvent) => void): () => void {
    this.listeners.add(listener)
    void this.getRuntime().catch((error) => {
      electronLogger.warn('[agent] Failed to initialize external runtime', error)
    })
    return () => {
      this.listeners.delete(listener)
    }
  }

  async start(request: DesktopAgentStartRequest = {}): Promise<void> {
    await this.getRuntime(request).then(runtime => runtime.start(request))
  }

  async startSession(
    request: DesktopAgentStartSessionRequest,
  ): Promise<DesktopAgentStartSessionResponse> {
    return await (await this.getRuntime(request)).startSession(request)
  }

  async sendMessage(
    request: DesktopAgentSendMessageRequest,
  ): Promise<DesktopAgentSendMessageResponse> {
    return await (await this.getRuntime(request)).sendMessage(request)
  }

  async interrupt(request: DesktopAgentProviderRequest = {}): Promise<void> {
    await (await this.getRuntime(request)).interrupt(request)
  }

  async getStatus(request: DesktopAgentProviderRequest = {}): Promise<DesktopAgentStatus> {
    return (await this.getRuntime(request)).getStatus()
  }

  async setMode(request: DesktopAgentSetModeRequest): Promise<DesktopAgentStatus> {
    return await (await this.getRuntime(request)).setMode(request)
  }

  async listSessions(
    request: DesktopAgentListSessionsRequest,
  ): Promise<DesktopAgentListSessionsResponse> {
    return await (await this.getRuntime(request)).listSessions(request)
  }

  async resumeSession(
    request: DesktopAgentResumeSessionRequest,
  ): Promise<DesktopAgentResumeSessionResponse> {
    return await (await this.getRuntime(request)).resumeSession(request)
  }

  async stop(request: DesktopAgentProviderRequest = {}): Promise<void> {
    const provider = request.provider ?? DEFAULT_AGENT_PROVIDER
    const runtime = this.runtimes.get(provider)
    if (!runtime) return
    runtime.stop(request)
    this.runtimes.delete(provider)
  }

  private async getRuntime(
    request: DesktopAgentProviderRequest = {},
  ): Promise<ExternalAgentRuntime> {
    const provider = request.provider ?? DEFAULT_AGENT_PROVIDER
    const existing = this.runtimes.get(provider)
    if (existing) {
      return existing
    }
    if (!this.runtimeConstructor) {
      this.runtimeConstructor = await loadRuntimeConstructor()
    }
    const runtime = new this.runtimeConstructor({
      clientInfo: {
        name: 'ecos-studio',
        title: 'ECOS Studio',
        version: '0.1.0',
      },
      defaultApprovalResponse: { decision: 'accept' },
      provider,
      serviceName: 'ecos-studio',
    })
    runtime.onEvent((event) => this.emit(event))
    this.runtimes.set(provider, runtime)
    return runtime
  }

  private emit(event: DesktopAgentEvent): void {
    for (const listener of this.listeners) {
      listener(event)
    }
  }
}
