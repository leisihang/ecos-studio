import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  DesktopAgentChatMessage,
  DesktopAgentMode,
  DesktopAgentSessionSummary,
  DesktopAgentStatus,
} from '@ecos-studio/shared'
import type { Message } from '../types'

const generateId = (): string => {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

export const useCodexChatStore = defineStore('codex-chat', () => {
  const messages = ref<Message[]>([])
  const threads = ref<DesktopAgentSessionSummary[]>([])
  const isLoadingThreads = ref(false)
  const isSending = ref(false)
  const isInterrupting = ref(false)
  const showHistoryMenu = ref(false)
  const agentMode = ref<DesktopAgentMode>('general_assistant')
  const codexStatus = ref<DesktopAgentStatus | null>(null)

  const addUserMessage = (content: string): string => {
    const id = generateId()
    messages.value.push({
      id,
      role: 'user',
      content,
      type: 'text',
      status: 'done',
    })
    return id
  }

  const addAssistantMessage = (
    content = '',
    status: 'loading' | 'done' | 'error' = 'loading',
  ): string => {
    const id = generateId()
    messages.value.push({
      id,
      role: 'assistant',
      content,
      type: 'text',
      status,
    })
    return id
  }

  const updateMessage = (id: string, partial: Partial<Pick<Message, 'content' | 'status'>>) => {
    const message = messages.value.find(m => m.id === id)
    if (!message) return
    if (partial.content !== undefined) {
      message.content = partial.content
    }
    if (partial.status !== undefined) {
      message.status = partial.status
    }
  }

  const appendToMessage = (id: string, content: string) => {
    const message = messages.value.find(m => m.id === id)
    if (message) {
      message.content += content
    }
  }

  const replaceMessages = (items: DesktopAgentChatMessage[]) => {
    messages.value.splice(
      0,
      messages.value.length,
      ...items.map(item => ({
        id: generateId(),
        role: item.role,
        content: item.content,
        type: 'text' as const,
        status: 'done' as const,
      })),
    )
  }

  const removeMessage = (id: string) => {
    const index = messages.value.findIndex(message => message.id === id)
    if (index !== -1) {
      messages.value.splice(index, 1)
    }
  }

  const clearMessages = () => {
    messages.value.splice(0, messages.value.length)
  }

  return {
    agentMode,
    addAssistantMessage,
    addUserMessage,
    appendToMessage,
    clearMessages,
    codexStatus,
    isInterrupting,
    isLoadingThreads,
    isSending,
    messages,
    removeMessage,
    replaceMessages,
    setAgentMode: (mode: DesktopAgentMode) => {
      agentMode.value = mode
    },
    setCodexStatus: (status: DesktopAgentStatus | null) => {
      codexStatus.value = status
      if (status) {
        agentMode.value = status.mode
      }
    },
    showHistoryMenu,
    threads,
    updateMessage,
  }
})
