<template>
  <div class="h-full flex flex-col min-w-0">
    <div
      ref="scrollContainerRef"
      class="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden px-4 custom-scrollbar"
    >
      <div v-if="messages.length === 0" class="flex flex-col items-center justify-center h-full text-center py-12">
        <div class="w-16 h-16 rounded-full bg-(--bg-secondary) flex items-center justify-center mb-4">
          <i class="ri-robot-2-line text-4xl text-(--text-secondary) opacity-50"></i>
        </div>
        <p class="text-[13px] text-(--text-secondary) leading-relaxed">
          No messages, please enter instructions to start chatting.
        </p>
      </div>
      <div v-else class="messages-container py-4 space-y-4 min-w-0 w-full max-w-full overflow-hidden">
        <MessageItem
          v-for="msg in messages"
          :key="msg.id"
          :message="msg"
          @img-load="onImageLoad"
          @close="codexChatStore.removeMessage(msg.id)"
          class="message-item w-full min-w-0 max-w-full"
        />
      </div>
    </div>

    <div class="shrink-0 p-4 bg-(--bg-primary) border-t border-(--border-color)">
      <div class="bg-(--bg-secondary) rounded-xl border border-(--border-color) p-2">
        <textarea
          v-model="inputValue"
          class="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-[13px] text-(--text-primary) min-h-[80px] p-2 resize-none"
          @compositionstart="isComposing = true"
          @compositionend="isComposing = false"
          @keydown="handleKeyDown"
        ></textarea>

        <div class="flex items-center justify-between mt-2 px-1">
          <div class="flex items-center gap-3">
            <CodexHistoryMenu
              ref="historyMenuRef"
              :open="showHistoryMenu"
              :threads="codexThreads"
              :loading="isLoadingThreads"
              @toggle="toggleHistoryMenu"
              @refresh="loadCodexThreads"
              @resume="handleResumeThread"
            />

            <div class="relative" ref="modeSelectRef">
              <button
                @click="toggleModeMenu"
                class="mode-selector flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-(--border-color) bg-(--bg-primary) hover:border-(--text-secondary)/50 transition-colors duration-150"
              >
                <i :class="[currentMode.icon, 'text-sm text-(--text-secondary)']"></i>
                <i
                  class="ri-arrow-down-s-line text-xs text-(--text-secondary) transition-transform duration-200"
                  :class="{ 'rotate-180': showModeMenu }"
                ></i>
              </button>

              <Transition name="popup">
                <div
                  v-if="showModeMenu"
                  class="absolute bottom-full left-0 mb-2 min-w-[140px] bg-(--bg-tertiary) border border-(--border-color)/50 rounded-xl shadow-xl overflow-hidden z-50"
                >
                  <div class="py-1">
                    <div
                      v-for="mode in modes"
                      :key="mode.id"
                      @click="selectMode(mode.id)"
                      :class="[
                        'flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors duration-150',
                        agentMode === mode.id
                          ? 'text-(--text-primary) bg-(--bg-secondary)'
                          : 'text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-secondary)/50'
                      ]"
                    >
                      <i :class="[mode.icon, 'text-sm']"></i>
                      <span class="text-xs font-medium flex-1">{{ mode.label }}</span>
                      <i v-if="agentMode === mode.id" class="ri-check-line text-xs text-(--accent-color)"></i>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>

            <div
              v-if="modeStatusText"
              class="hidden sm:flex items-center gap-1.5 min-w-0 text-[11px] text-(--text-secondary)"
            >
              <span
                class="h-1.5 w-1.5 rounded-full"
                :class="agentMode === 'flow_guarded_design' && codexStatus?.flowGuard
                  ? 'bg-emerald-500'
                  : 'bg-(--border-color)'"
              ></span>
              <span class="truncate max-w-[180px]">{{ modeStatusText }}</span>
            </div>
          </div>

          <button
            @click="isSending ? handleInterruptTurn() : handleSubmit()"
            class="send-btn"
            :class="{
              'send-btn-active': inputValue.trim() && !isSending,
              'send-btn-stop': isSending,
            }"
            :disabled="!isSending && !inputValue.trim()"
          >
            <i :class="isSending ? 'ri-stop-fill' : 'ri-send-plane-2-fill'"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onActivated, onMounted, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import type { DesktopAgentMode } from '@ecos-studio/shared'
import MessageItem from './MessageItem.vue'
import CodexHistoryMenu from './CodexHistoryMenu.vue'
import { useCodexChatStore } from '../stores/codexChatStore'
import { useWorkspace } from '@/composables/useWorkspace'
import { useCodexChat } from '@/composables/useCodexChat'
import { useCodexInputHistory } from '@/composables/useCodexInputHistory'
import { useCodexThreads } from '@/composables/useCodexThreads'
import { waitForDesktopApi } from '@/platform/desktop'

const NEAR_BOTTOM_THRESHOLD = 32

const codexChatStore = useCodexChatStore()
const { agentMode, codexStatus, messages } = storeToRefs(codexChatStore)
const { currentProject } = useWorkspace()

const inputValue = ref('')
const scrollContainerRef = ref<HTMLDivElement | null>(null)
const modeSelectRef = ref<HTMLDivElement | null>(null)
const historyMenuRef = ref<InstanceType<typeof CodexHistoryMenu> | null>(null)
const showModeMenu = ref(false)
const isComposing = ref(false)

const modes = [
  { id: 'general_assistant' as const, label: '通用助手', icon: 'ri-chat-3-line' },
  { id: 'flow_guarded_design' as const, label: '设计流护航', icon: 'ri-route-line' },
]

const currentMode = computed(() => {
  return modes.find(m => m.id === agentMode.value) || modes[0]
})

const projectPath = computed(() => currentProject.value?.path ?? null)

const currentFlowStep = computed(() => {
  const steps = codexStatus.value?.flowGuard?.steps
  if (!steps) return null
  return Object.values(steps).find(step => step.status === 'running')
    ?? Object.values(steps).find(step => step.status === 'ready')
    ?? Object.values(steps).find(step => step.status === 'manual_review' || step.status === 'failed')
    ?? null
})

const modeStatusText = computed(() => {
  if (agentMode.value === 'general_assistant') {
    return '通用助手'
  }
  if (!codexStatus.value?.flowGuard) {
    return '设计流护航待启用'
  }
  const step = currentFlowStep.value
  return step ? `${step.id} ${step.status}` : '设计流护航已启用'
})

const isNearBottom = (): boolean => {
  const el = scrollContainerRef.value
  if (!el) return true
  return el.scrollHeight - (el.scrollTop + el.clientHeight) <= NEAR_BOTTOM_THRESHOLD
}

const scrollToBottom = (smooth = true) => {
  const el = scrollContainerRef.value
  if (!el) return

  if (smooth) {
    el.scrollTo({
      top: el.scrollHeight,
      behavior: 'smooth',
    })
  } else {
    el.scrollTop = el.scrollHeight
  }
}

const scrollToBottomIfNeeded = (force = false) => {
  nextTick(() => {
    if (force || isNearBottom()) {
      scrollToBottom()
    }
  })
}

const onImageLoad = () => {
  requestAnimationFrame(() => {
    if (isNearBottom()) {
      scrollToBottom()
    }
  })
}

const {
  adoptResumedThread,
  interruptTurn,
  isSending,
  sendPrompt,
} = useCodexChat({
  agentMode,
  projectPath,
  scrollToBottomIfNeeded,
})

const {
  codexThreads,
  closeHistoryMenu,
  isLoadingThreads,
  loadCodexThreads,
  resumeThread,
  showHistoryMenu,
  toggleHistoryMenu,
} = useCodexThreads(projectPath, {
  afterResume(projectPathValue) {
    adoptResumedThread(projectPathValue)
  },
})

const { handleHistoryKeyDown, recordPrompt } = useCodexInputHistory(inputValue)

const toggleModeMenu = () => {
  showModeMenu.value = !showModeMenu.value
  if (showModeMenu.value) {
    closeHistoryMenu()
  }
}

const selectMode = async (modeId: DesktopAgentMode) => {
  showModeMenu.value = false
  codexChatStore.setAgentMode(modeId)

  try {
    const desktopApi = await waitForDesktopApi()
    const status = await desktopApi.agent.setMode({
      cwd: projectPath.value,
      mode: modeId,
    })
    codexChatStore.setCodexStatus(status)
  } catch (error) {
    codexChatStore.addAssistantMessage(
      error instanceof Error ? error.message : String(error),
      'error',
    )
  }
}

const handleClickOutside = (e: MouseEvent) => {
  if (modeSelectRef.value && !modeSelectRef.value.contains(e.target as Node)) {
    showModeMenu.value = false
  }
  if (historyMenuRef.value && !historyMenuRef.value.contains(e.target as Node)) {
    closeHistoryMenu()
  }
}

const handleSubmit = async () => {
  const prompt = inputValue.value.trim()
  if (!prompt || isSending.value) {
    return
  }

  recordPrompt(prompt)
  inputValue.value = ''
  await sendPrompt(prompt)
}

const handleInterruptTurn = async () => {
  await interruptTurn()
}

const handleResumeThread = async (threadId: string) => {
  await resumeThread(threadId)
}

const handleKeyDown = (e: KeyboardEvent) => {
  if (isComposing.value || e.isComposing || e.key === 'Process') {
    return
  }

  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    if (!isSending.value) {
      void handleSubmit()
    }
    return
  }

  handleHistoryKeyDown(e)
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

onActivated(() => {
  nextTick(() => {
    requestAnimationFrame(() => {
      scrollToBottom(false)
    })
  })
})

watch(() => messages.value.length, (newLength, oldLength) => {
  if (newLength > oldLength) {
    scrollToBottomIfNeeded(true)
  }
})
</script>

<style scoped>
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: var(--border-color) transparent;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

.messages-container {
  contain: layout style;
  box-sizing: border-box;
}

.message-item {
  contain: layout style paint;
  box-sizing: border-box;
}

.send-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-size: 15px;
  color: var(--text-secondary);
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
  overflow: hidden;
}

.send-btn:hover {
  color: var(--accent-color);
  border-color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 8%, var(--bg-primary));
}

.send-btn:disabled {
  cursor: default;
  opacity: 0.55;
}

.send-btn-active {
  color: #fff;
  background: var(--accent-color);
  border-color: var(--accent-color);
  box-shadow: 0 2px 12px color-mix(in srgb, var(--accent-color) 40%, transparent);
}

.send-btn-active:hover {
  color: #fff;
  background: color-mix(in srgb, var(--accent-color) 85%, #000);
  border-color: color-mix(in srgb, var(--accent-color) 85%, #000);
  box-shadow: 0 4px 20px color-mix(in srgb, var(--accent-color) 50%, transparent);
  transform: translateY(-1px);
}

.send-btn-active:active {
  transform: translateY(0) scale(0.95);
  box-shadow: 0 1px 6px color-mix(in srgb, var(--accent-color) 30%, transparent);
}

.send-btn-stop {
  color: #fff;
  background: #dc2626;
  border-color: #dc2626;
  box-shadow: 0 2px 12px rgb(220 38 38 / 0.3);
}

.send-btn-stop:hover {
  color: #fff;
  background: #b91c1c;
  border-color: #b91c1c;
  box-shadow: 0 4px 20px rgb(220 38 38 / 0.4);
}

.popup-enter-active,
.popup-leave-active {
  transition: opacity 0.15s ease-out, transform 0.15s ease-out;
}

.popup-enter-from,
.popup-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
