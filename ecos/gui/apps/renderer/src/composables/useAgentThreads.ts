import { storeToRefs } from 'pinia'
import type { DesktopAgentSessionSummary } from '@ecos-studio/shared'
import { waitForDesktopApi } from '@/platform/desktop'
import { useAgentChatStore } from '../stores/agentChatStore'

interface UseAgentThreadsOptions {
  afterResume(projectPath: string): void
}

export function useAgentThreads(
  projectPath: { value: string | null },
  options: UseAgentThreadsOptions,
) {
  const agentChatStore = useAgentChatStore()
  const {
    isLoadingThreads,
    showHistoryMenu,
    threads: agentThreads,
  } = storeToRefs(agentChatStore)

  const formatThreadTime = (timestampSeconds: number) => {
    if (!timestampSeconds) return ''
    return new Date(timestampSeconds * 1000).toLocaleString()
  }

  const loadAgentThreads = async () => {
    const cwd = projectPath.value
    if (!cwd || isLoadingThreads.value) {
      return
    }

    isLoadingThreads.value = true
    try {
      const desktopApi = await waitForDesktopApi()
      const response = await desktopApi.agent.listSessions({
        cwd,
        limit: 30,
      })
      agentThreads.value = response.sessions as DesktopAgentSessionSummary[]
    } catch (error) {
      console.error('Failed to load Agent sessions:', error)
    } finally {
      isLoadingThreads.value = false
    }
  }

  const resumeThread = async (threadId: string) => {
    const cwd = projectPath.value
    if (!cwd) {
      return
    }

    showHistoryMenu.value = false
    try {
      const desktopApi = await waitForDesktopApi()
      const response = await desktopApi.agent.resumeSession({
        cwd,
        sessionId: threadId,
      })
      agentChatStore.replaceMessages(response.messages)
      options.afterResume(cwd)
    } catch (error) {
      agentChatStore.addAssistantMessage(
        error instanceof Error ? error.message : String(error),
        'error',
      )
    }
  }

  const toggleHistoryMenu = async () => {
    showHistoryMenu.value = !showHistoryMenu.value
    if (showHistoryMenu.value) {
      await loadAgentThreads()
    }
  }

  const closeHistoryMenu = () => {
    showHistoryMenu.value = false
  }

  return {
    closeHistoryMenu,
    agentThreads,
    formatThreadTime,
    isLoadingThreads,
    loadAgentThreads,
    resumeThread,
    showHistoryMenu,
    toggleHistoryMenu,
  }
}
