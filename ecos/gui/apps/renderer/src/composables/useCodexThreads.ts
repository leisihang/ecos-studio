import { storeToRefs } from 'pinia'
import type { DesktopAgentSessionSummary } from '@ecos-studio/shared'
import { waitForDesktopApi } from '@/platform/desktop'
import { useCodexChatStore } from '../stores/codexChatStore'

interface UseCodexThreadsOptions {
  afterResume(projectPath: string): void
}

export function useCodexThreads(
  projectPath: { value: string | null },
  options: UseCodexThreadsOptions,
) {
  const codexChatStore = useCodexChatStore()
  const {
    isLoadingThreads,
    showHistoryMenu,
    threads: codexThreads,
  } = storeToRefs(codexChatStore)

  const formatThreadTime = (timestampSeconds: number) => {
    if (!timestampSeconds) return ''
    return new Date(timestampSeconds * 1000).toLocaleString()
  }

  const loadCodexThreads = async () => {
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
      codexThreads.value = response.sessions as DesktopAgentSessionSummary[]
    } catch (error) {
      console.error('Failed to load Codex threads:', error)
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
      codexChatStore.replaceMessages(response.messages)
      options.afterResume(cwd)
    } catch (error) {
      codexChatStore.addAssistantMessage(
        error instanceof Error ? error.message : String(error),
        'error',
      )
    }
  }

  const toggleHistoryMenu = async () => {
    showHistoryMenu.value = !showHistoryMenu.value
    if (showHistoryMenu.value) {
      await loadCodexThreads()
    }
  }

  const closeHistoryMenu = () => {
    showHistoryMenu.value = false
  }

  return {
    closeHistoryMenu,
    codexThreads,
    formatThreadTime,
    isLoadingThreads,
    loadCodexThreads,
    resumeThread,
    showHistoryMenu,
    toggleHistoryMenu,
  }
}
