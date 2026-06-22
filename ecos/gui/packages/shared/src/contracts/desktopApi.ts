import type { TileGenerationRequest, TileGenerationResult } from '../types/tile.ts'
import type {
  WorkspaceResourceIndex,
  WorkspaceStepInfoRequest,
  WorkspaceStepInfoResult,
} from '../types/workspaceResources.ts'
import type {
  ResourceImportPdkRequest,
  ResourceInfo,
  ResourceInstallRequest,
  ResourceJob,
  ResourceList,
  ResourceOperationResult,
} from './resources.ts'
import type { RemoteContentApi } from './remoteContent.ts'
import type {
  DesktopCliCommandEvent,
  DesktopCliCommandRequest,
  DesktopCliCommandResult,
} from './desktopCli.ts'
import type {
  DesktopEventUnsubscribe,
  DesktopMenuEventId,
  DesktopProjectFileChangedEvent,
  DesktopProjectLogTailEvent,
} from './desktopEvents.ts'
import type {
  DesktopShellDataEvent,
  DesktopShellExitEvent,
  DesktopShellSession,
  DesktopShellSessionOptions,
} from './desktopShell.ts'

export type DesktopSettingsValue =
  | string
  | number
  | boolean
  | null
  | DesktopSettingsValue[]
  | {
      [key: string]: DesktopSettingsValue
    }

export interface DesktopDirectoryDialogOptions {
  title?: string
}

export interface DesktopFileDialogFilter {
  name: string
  extensions: string[]
}

export interface DesktopFileDialogOptions {
  title?: string
  multiple?: boolean
  filters?: DesktopFileDialogFilter[]
}

export interface PdkDetectedFiles {
  directories: string[]
  files: string[]
}

export interface ScannedPdkDirectory {
  canonicalPath: string
  name: string
  description: string
  techNode: string
  pdkId: string
  detectedFiles: PdkDetectedFiles
}

export interface VersionInfo {
  gui: string
  runtime: string
  ecc: string
  dreamplace: string
  eccTools?: string
}

export interface DesktopProjectTextFileTail {
  content: string
  truncated: boolean
  sizeBytes: number
}

export interface DesktopProjectTextFileUpdate {
  content: string
  fromOffsetBytes: number
  nextOffsetBytes: number
  sizeBytes: number
  reset: boolean
  truncated: boolean
}

export interface DesktopProjectLogTailSubscriptionOptions {
  maxInitialChars?: number
  maxChunkChars?: number
  pollIntervalMs?: number
}

export type DesktopAgentProviderId = string

export type DesktopAgentMode = 'general_assistant' | 'flow_guarded_design'

export interface DesktopAgentStepState {
  id: string
  reason: string | null
  status: string
  updatedAt: number
}

export interface DesktopAgentFlowGuardStatus {
  activeStep: string | null
  projectRoot: string | null
  steps: Record<string, DesktopAgentStepState>
}

export interface DesktopAgentStatus {
  activeTurnId: string | null
  flowGuard: DesktopAgentFlowGuardStatus | null
  mode: DesktopAgentMode
  provider: DesktopAgentProviderId
  threadId: string | null
}

export interface DesktopAgentSessionSummary {
  id: string
  provider: DesktopAgentProviderId
  cwd: string
  preview: string
  createdAt: number
  updatedAt: number
  name: string | null
}

export interface DesktopAgentChatMessage {
  content: string
  role: 'assistant' | 'user'
}

export interface DesktopAgentProviderRequest {
  provider?: DesktopAgentProviderId | null
}

export type DesktopAgentStartRequest = DesktopAgentProviderRequest

export interface DesktopAgentStartSessionRequest extends DesktopAgentProviderRequest {
  cwd: string
}

export interface DesktopAgentStartSessionResponse {
  provider: DesktopAgentProviderId
  sessionId: string
}

export interface DesktopAgentSendMessageRequest extends DesktopAgentProviderRequest {
  cwd?: string | null
  mode?: DesktopAgentMode | null
  prompt: string
}

export interface DesktopAgentSendMessageResponse {
  messageId: string
  provider: DesktopAgentProviderId
}

export interface DesktopAgentSetModeRequest extends DesktopAgentProviderRequest {
  cwd?: string | null
  mode: DesktopAgentMode
}

export interface DesktopAgentListSessionsRequest extends DesktopAgentProviderRequest {
  cwd?: string | null
  limit?: number | null
}

export interface DesktopAgentListSessionsResponse {
  sessions: DesktopAgentSessionSummary[]
}

export interface DesktopAgentResumeSessionRequest extends DesktopAgentProviderRequest {
  cwd?: string | null
  sessionId: string
}

export interface DesktopAgentResumeSessionResponse {
  messages: DesktopAgentChatMessage[]
  provider: DesktopAgentProviderId
  sessionId: string
}

export interface DesktopAgentActionEvent {
  content: string
  id: string | null
  kind: 'command' | 'fileChange' | string
  status: 'running' | 'done' | 'error' | string
}

export type DesktopAgentEvent =
  | {
      action: DesktopAgentActionEvent
      provider: DesktopAgentProviderId
      type: 'action'
    }
  | {
      delta: string
      provider: DesktopAgentProviderId
      type: 'messageDelta'
    }
  | {
      provider: DesktopAgentProviderId
      type: 'messageCompleted'
    }
  | {
      provider: DesktopAgentProviderId
      status: DesktopAgentStatus
      type: 'status'
    }
  | {
      decision: unknown
      provider: DesktopAgentProviderId
      type: 'flowGuardDecision'
    }
  | {
      message: string
      provider: DesktopAgentProviderId
      type: 'error' | 'stderr'
    }
  | {
      code: number | null
      provider: DesktopAgentProviderId
      signal: string | null
      type: 'exit'
    }

export interface DesktopApi {
  app: {
    getVersions(): Promise<VersionInfo>
  }
  window: {
    minimize(): Promise<void>
    toggleMaximize(): Promise<void>
    close(): Promise<void>
    confirmClose(): Promise<void>
    setTitle(title: string): Promise<void>
    isMaximized(): Promise<boolean>
    onCloseRequested(listener: () => void): DesktopEventUnsubscribe
    onResized(listener: () => void): DesktopEventUnsubscribe
    onMaximizedChanged(listener: (isMaximized: boolean) => void): DesktopEventUnsubscribe
  }
  menu: {
    onAction(listener: (eventId: DesktopMenuEventId) => void): DesktopEventUnsubscribe
  }
  system: {
    openExternal(url: string): Promise<void>
  }
  settings: {
    get<T extends DesktopSettingsValue = DesktopSettingsValue>(key: string): Promise<T | null>
    set(key: string, value: DesktopSettingsValue): Promise<void>
    delete(key: string): Promise<void>
  }
  remoteContent: RemoteContentApi
  dialog: {
    pickDirectory(options?: DesktopDirectoryDialogOptions): Promise<string | null>
    pickFiles(options?: DesktopFileDialogOptions): Promise<string[] | null>
  }
  workspace: {
    isProjectDirectory(path: string): Promise<boolean>
    registerProjectRoot(path: string): Promise<string>
    clearProjectRoot(): Promise<void>
    requestProjectPathAccess(path: string): Promise<string>
    readProjectTextFile(path: string): Promise<string>
    readOptionalProjectTextFile(path: string): Promise<string | null>
    readProjectTextFileTail(path: string, maxChars: number): Promise<string | null>
    readOptionalProjectTextFileTail?(
      path: string,
      maxChars: number,
    ): Promise<DesktopProjectTextFileTail | null>
    readOptionalProjectTextFileUpdate?(
      path: string,
      fromOffsetBytes: number,
      maxChars: number,
    ): Promise<DesktopProjectTextFileUpdate | null>
    subscribeProjectLogTail?(
      path: string,
      options: DesktopProjectLogTailSubscriptionOptions,
      listener: (event: DesktopProjectLogTailEvent) => void,
    ): Promise<DesktopEventUnsubscribe>
    readProjectBinaryFile(path: string): Promise<Uint8Array>
    writeProjectTextFile(path: string, content: string): Promise<void>
    scanPdkDirectory(path: string): Promise<ScannedPdkDirectory>
    watchProjectFile(
      path: string,
      listener: (event: DesktopProjectFileChangedEvent) => void,
    ): Promise<DesktopEventUnsubscribe>
  }
  tiles: {
    generate(request: TileGenerationRequest): Promise<TileGenerationResult>
    getStatus(request: TileGenerationRequest): Promise<TileGenerationResult>
  }
  workspaceResources: {
    getIndex(): Promise<WorkspaceResourceIndex>
    readHome(): Promise<Record<string, unknown> | null>
    readFlow(): Promise<Record<string, unknown> | null>
    readParameters(): Promise<Record<string, unknown> | null>
    resolveStepInfo(request: WorkspaceStepInfoRequest): Promise<WorkspaceStepInfoResult>
  }
  resources: {
    list(): Promise<ResourceList>
    get(resourceId: string): Promise<ResourceInfo>
    install(request: ResourceInstallRequest): Promise<ResourceOperationResult>
    update(resourceId: string): Promise<ResourceOperationResult>
    cancel(resourceId: string): Promise<ResourceOperationResult>
    uninstall(resourceId: string): Promise<ResourceOperationResult>
    activatePdk(resourceId: string): Promise<ResourceOperationResult>
    validatePdk(resourceId: string): Promise<{ resource_id: string; health: { status: string } }>
    removePdkReference(resourceId: string): Promise<ResourceOperationResult>
    importPdkPath(request: ResourceImportPdkRequest): Promise<ResourceInfo>
    refreshRegistry(): Promise<{ status: string; tools_count: number }>
    onProgress(listener: (event: ResourceJob) => void): DesktopEventUnsubscribe
  }
  cli: {
    execute(request: DesktopCliCommandRequest): Promise<DesktopCliCommandResult>
    onEvent(listener: (event: DesktopCliCommandEvent) => void): DesktopEventUnsubscribe
  }
  shell: {
    createSession(options: DesktopShellSessionOptions): Promise<DesktopShellSession>
    write(sessionId: string, data: string): Promise<void>
    resize(sessionId: string, cols: number, rows: number): Promise<void>
    kill(sessionId: string): Promise<void>
    onData(listener: (event: DesktopShellDataEvent) => void): DesktopEventUnsubscribe
    onExit(listener: (event: DesktopShellExitEvent) => void): DesktopEventUnsubscribe
  }
  agent: {
    start(request?: DesktopAgentStartRequest): Promise<void>
    startSession(request: DesktopAgentStartSessionRequest): Promise<DesktopAgentStartSessionResponse>
    sendMessage(request: DesktopAgentSendMessageRequest): Promise<DesktopAgentSendMessageResponse>
    interrupt(request?: DesktopAgentProviderRequest): Promise<void>
    getStatus(request?: DesktopAgentProviderRequest): Promise<DesktopAgentStatus>
    setMode(request: DesktopAgentSetModeRequest): Promise<DesktopAgentStatus>
    listSessions(request: DesktopAgentListSessionsRequest): Promise<DesktopAgentListSessionsResponse>
    resumeSession(request: DesktopAgentResumeSessionRequest): Promise<DesktopAgentResumeSessionResponse>
    stop(request?: DesktopAgentProviderRequest): Promise<void>
    onEvent(listener: (event: DesktopAgentEvent) => void): Promise<DesktopEventUnsubscribe>
  }
}
