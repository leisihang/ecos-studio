import { onMounted, onUnmounted, ref, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import type {
  DesktopAgentEvent,
  DesktopAgentMode,
  DesktopAgentStatus,
  DesktopEventUnsubscribe,
} from '@ecos-studio/shared'
import { waitForDesktopApi } from '@/platform/desktop'
import { useCodexChatStore } from '../stores/codexChatStore'

interface UseCodexChatOptions {
  agentMode: Ref<DesktopAgentMode>
  projectPath: Ref<string | null>
  scrollToBottomIfNeeded(force?: boolean): void
}

export function useCodexChat(options: UseCodexChatOptions) {
  const codexChatStore = useCodexChatStore()
  const { isInterrupting, isSending } = storeToRefs(codexChatStore)
  const activeAssistantMessageId = ref<string | null>(null)
  const activeActionBlockIds = new Map<string, string>()
  let unsubscribeCodexEvents: DesktopEventUnsubscribe | null = null
  let codexThreadStartedForPath: string | null = null

  const appendAssistantDelta = (delta: string) => {
    const assistantId = ensureAssistantMessage()
    codexChatStore.appendToMessage(assistantId, delta)
    options.scrollToBottomIfNeeded()
  }

  const ensureAssistantMessage = () => {
    if (activeAssistantMessageId.value) {
      return activeAssistantMessageId.value
    }

    const assistantId = codexChatStore.addAssistantMessage('', 'loading')
    activeAssistantMessageId.value = assistantId
    return assistantId
  }

  const finishActiveAssistantBlock = () => {
    const assistantId = activeAssistantMessageId.value
    if (!assistantId) return
    codexChatStore.updateMessage(assistantId, { status: 'done' })
    activeAssistantMessageId.value = null
  }

  const resetStreamingState = () => {
    activeActionBlockIds.clear()
    activeAssistantMessageId.value = null
    isSending.value = false
    isInterrupting.value = false
  }

  const completeAssistantMessage = () => {
    finishActiveAssistantBlock()
    for (const blockId of activeActionBlockIds.values()) {
      codexChatStore.updateMessage(blockId, { status: 'done' })
    }
    resetStreamingState()
  }

  const failAssistantMessage = (message: string) => {
    const assistantId = activeAssistantMessageId.value
    if (assistantId) {
      codexChatStore.updateMessage(assistantId, {
        content: message,
        status: 'error',
      })
    }
    resetStreamingState()
  }

  const addCodexBlock = (content: string, status: 'loading' | 'done' | 'error' = 'done') => {
    finishActiveAssistantBlock()
    const blockId = codexChatStore.addAssistantMessage(content, status)
    options.scrollToBottomIfNeeded(true)
    return blockId
  }

  const upsertActionBlock = (
    itemId: string | null,
    content: string,
    status: 'loading' | 'done' | 'error' = 'loading',
  ) => {
    finishActiveAssistantBlock()
    if (!itemId) {
      return addCodexBlock(content, status)
    }

    const existingId = activeActionBlockIds.get(itemId)
    if (existingId) {
      codexChatStore.updateMessage(existingId, { content, status })
      options.scrollToBottomIfNeeded()
      return existingId
    }

    const blockId = codexChatStore.addAssistantMessage(content, status)
    activeActionBlockIds.set(itemId, blockId)
    options.scrollToBottomIfNeeded(true)
    return blockId
  }

  const handleCodexEvent = (event: DesktopAgentEvent) => {
    if (event.type === 'status') {
      codexChatStore.setCodexStatus(event.status as DesktopAgentStatus)
      return
    }

    if (event.type === 'messageDelta') {
      appendAssistantDelta(event.delta)
      return
    }

    if (event.type === 'action') {
      const itemId = event.action.id
      const status = event.action.status === 'done' ? 'done' : 'loading'
      upsertActionBlock(itemId, event.action.content, status)
      if (status === 'done' && itemId) {
        activeActionBlockIds.delete(itemId)
      }
      return
    }

    if (event.type === 'messageCompleted') {
      completeAssistantMessage()
      return
    }

    if (event.type === 'error') {
      failAssistantMessage(event.message)
      return
    }

    if (event.type === 'stderr' && event.message.trim()) {
      console.warn('[agent]', event.message.trim())
    }
  }

  const ensureCodexThread = async (projectPath: string) => {
    if (codexThreadStartedForPath === projectPath) {
      return
    }

    const desktopApi = await waitForDesktopApi()
    await desktopApi.agent.startSession({ cwd: projectPath })
    codexThreadStartedForPath = projectPath
  }

  const sendPrompt = async (prompt: string) => {
    if (!prompt || isSending.value) {
      return
    }

    const projectPath = options.projectPath.value
    if (!projectPath) {
      codexChatStore.addUserMessage(prompt)
      const assistantId = codexChatStore.addAssistantMessage(
        'Open or create an ECOS project before using the assistant.',
        'error',
      )
      activeAssistantMessageId.value = assistantId
      activeAssistantMessageId.value = null
      return
    }

    codexChatStore.addUserMessage(prompt)
    const assistantId = codexChatStore.addAssistantMessage('', 'loading')
    activeAssistantMessageId.value = assistantId
    isSending.value = true

    try {
      await ensureCodexThread(projectPath)
      const desktopApi = await waitForDesktopApi()
      await desktopApi.agent.sendMessage({
        cwd: projectPath,
        mode: options.agentMode.value,
        prompt,
      })
    } catch (error) {
      failAssistantMessage(error instanceof Error ? error.message : String(error))
    }
  }

  const interruptTurn = async () => {
    if (!isSending.value || isInterrupting.value) {
      return
    }

    isInterrupting.value = true
    try {
      const desktopApi = await waitForDesktopApi()
      await desktopApi.agent.interrupt()
      finishActiveAssistantBlock()
      for (const blockId of activeActionBlockIds.values()) {
        codexChatStore.updateMessage(blockId, { status: 'done' })
      }
      activeActionBlockIds.clear()
      codexChatStore.addAssistantMessage('Turn interrupted.', 'done')
      isSending.value = false
    } catch (error) {
      failAssistantMessage(error instanceof Error ? error.message : String(error))
    } finally {
      isInterrupting.value = false
    }
  }

  const adoptResumedThread = (projectPath: string) => {
    codexThreadStartedForPath = projectPath
    resetStreamingState()
    options.scrollToBottomIfNeeded(true)
  }

  onMounted(async () => {
    try {
      const desktopApi = await waitForDesktopApi()
      codexChatStore.setCodexStatus(await desktopApi.agent.getStatus())
      unsubscribeCodexEvents = await desktopApi.agent.onEvent(handleCodexEvent)
    } catch (error) {
      console.error('Failed to subscribe Codex events:', error)
    }
  })

  onUnmounted(() => {
    unsubscribeCodexEvents?.()
    unsubscribeCodexEvents = null
  })

  return {
    adoptResumedThread,
    interruptTurn,
    isInterrupting,
    isSending,
    sendPrompt,
  }
}
