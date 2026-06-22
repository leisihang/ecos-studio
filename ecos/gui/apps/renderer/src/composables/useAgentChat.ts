import { onMounted, onUnmounted, ref, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import type {
  DesktopAgentEvent,
  DesktopAgentMode,
  DesktopAgentStatus,
  DesktopEventUnsubscribe,
} from '@ecos-studio/shared'
import { waitForDesktopApi } from '@/platform/desktop'
import { useAgentChatStore } from '../stores/agentChatStore'

interface UseAgentChatOptions {
  agentMode: Ref<DesktopAgentMode>
  projectPath: Ref<string | null>
  scrollToBottomIfNeeded(force?: boolean): void
}

export function useAgentChat(options: UseAgentChatOptions) {
  const agentChatStore = useAgentChatStore()
  const { isInterrupting, isSending } = storeToRefs(agentChatStore)
  const activeAssistantMessageId = ref<string | null>(null)
  const activeActionBlockIds = new Map<string, string>()
  let unsubscribeAgentEvents: DesktopEventUnsubscribe | null = null
  let agentSessionStartedForPath: string | null = null

  const appendAssistantDelta = (delta: string) => {
    const assistantId = ensureAssistantMessage()
    agentChatStore.appendToMessage(assistantId, delta)
    options.scrollToBottomIfNeeded()
  }

  const ensureAssistantMessage = () => {
    if (activeAssistantMessageId.value) {
      return activeAssistantMessageId.value
    }

    const assistantId = agentChatStore.addAssistantMessage('', 'loading')
    activeAssistantMessageId.value = assistantId
    return assistantId
  }

  const finishActiveAssistantBlock = () => {
    const assistantId = activeAssistantMessageId.value
    if (!assistantId) return
    agentChatStore.updateMessage(assistantId, { status: 'done' })
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
      agentChatStore.updateMessage(blockId, { status: 'done' })
    }
    resetStreamingState()
  }

  const failAssistantMessage = (message: string) => {
    const assistantId = activeAssistantMessageId.value
    if (assistantId) {
      agentChatStore.updateMessage(assistantId, {
        content: message,
        status: 'error',
      })
    }
    resetStreamingState()
  }

  const addAgentBlock = (content: string, status: 'loading' | 'done' | 'error' = 'done') => {
    finishActiveAssistantBlock()
    const blockId = agentChatStore.addAssistantMessage(content, status)
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
      return addAgentBlock(content, status)
    }

    const existingId = activeActionBlockIds.get(itemId)
    if (existingId) {
      agentChatStore.updateMessage(existingId, { content, status })
      options.scrollToBottomIfNeeded()
      return existingId
    }

    const blockId = agentChatStore.addAssistantMessage(content, status)
    activeActionBlockIds.set(itemId, blockId)
    options.scrollToBottomIfNeeded(true)
    return blockId
  }

  const handleAgentEvent = (event: DesktopAgentEvent) => {
    if (event.type === 'status') {
      agentChatStore.setAgentStatus(event.status as DesktopAgentStatus)
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

  const ensureAgentSession = async (projectPath: string) => {
    if (agentSessionStartedForPath === projectPath) {
      return
    }

    const desktopApi = await waitForDesktopApi()
    await desktopApi.agent.startSession({ cwd: projectPath })
    agentSessionStartedForPath = projectPath
  }

  const sendPrompt = async (prompt: string) => {
    if (!prompt || isSending.value) {
      return
    }

    const projectPath = options.projectPath.value
    if (!projectPath) {
      agentChatStore.addUserMessage(prompt)
      const assistantId = agentChatStore.addAssistantMessage(
        'Open or create an ECOS project before using the assistant.',
        'error',
      )
      activeAssistantMessageId.value = assistantId
      activeAssistantMessageId.value = null
      return
    }

    agentChatStore.addUserMessage(prompt)
    const assistantId = agentChatStore.addAssistantMessage('', 'loading')
    activeAssistantMessageId.value = assistantId
    isSending.value = true

    try {
      await ensureAgentSession(projectPath)
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
        agentChatStore.updateMessage(blockId, { status: 'done' })
      }
      activeActionBlockIds.clear()
      agentChatStore.addAssistantMessage('Turn interrupted.', 'done')
      isSending.value = false
    } catch (error) {
      failAssistantMessage(error instanceof Error ? error.message : String(error))
    } finally {
      isInterrupting.value = false
    }
  }

  const adoptResumedThread = (projectPath: string) => {
    agentSessionStartedForPath = projectPath
    resetStreamingState()
    options.scrollToBottomIfNeeded(true)
  }

  onMounted(async () => {
    try {
      const desktopApi = await waitForDesktopApi()
      agentChatStore.setAgentStatus(await desktopApi.agent.getStatus())
      unsubscribeAgentEvents = await desktopApi.agent.onEvent(handleAgentEvent)
    } catch (error) {
      console.error('Failed to subscribe Agent events:', error)
    }
  })

  onUnmounted(() => {
    unsubscribeAgentEvents?.()
    unsubscribeAgentEvents = null
  })

  return {
    adoptResumedThread,
    interruptTurn,
    isInterrupting,
    isSending,
    sendPrompt,
  }
}
