<template>
  <div class="relative" ref="rootRef">
    <button
      class="mode-selector flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-(--border-color) bg-(--bg-primary) hover:border-(--text-secondary)/50 transition-colors duration-150"
      title="History"
      @click="$emit('toggle')"
    >
      <i class="ri-history-line text-sm text-(--text-secondary)"></i>
      <i
        class="ri-arrow-down-s-line text-xs text-(--text-secondary) transition-transform duration-200"
        :class="{ 'rotate-180': open }"
      ></i>
    </button>

    <Transition name="popup">
      <div
        v-if="open"
        class="history-menu absolute bottom-full left-0 mb-2 w-[320px] max-w-[calc(100vw-2rem)] border rounded-xl overflow-hidden z-[200]"
      >
        <div class="flex items-center justify-between px-3 py-2 border-b border-(--border-color)/50">
          <span class="text-xs font-medium text-(--text-primary)">History</span>
          <button
            class="history-refresh-btn"
            title="Refresh"
            @click.stop="$emit('refresh')"
          >
            <i class="ri-refresh-line"></i>
          </button>
        </div>
        <div class="max-h-[280px] overflow-y-auto custom-scrollbar">
          <button
            v-for="thread in threads"
            :key="thread.id"
            class="history-item"
            @click="$emit('resume', thread.id)"
          >
            <span class="history-title">{{ thread.name || thread.preview || 'Untitled thread' }}</span>
            <span class="history-meta">{{ formatThreadTime(thread.updatedAt) }}</span>
          </button>
          <div v-if="loading" class="history-empty">Loading...</div>
          <div v-else-if="threads.length === 0" class="history-empty">No saved threads</div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { DesktopAgentSessionSummary } from '@ecos-studio/shared'

defineProps<{
  loading: boolean
  open: boolean
  threads: DesktopAgentSessionSummary[]
}>()

defineEmits<{
  (e: 'refresh'): void
  (e: 'resume', threadId: string): void
  (e: 'toggle'): void
}>()

const rootRef = ref<HTMLDivElement | null>(null)

const formatThreadTime = (timestampSeconds: number) => {
  if (!timestampSeconds) return ''
  return new Date(timestampSeconds * 1000).toLocaleString()
}

const contains = (target: Node) => {
  return rootRef.value?.contains(target) ?? false
}

defineExpose({ contains })
</script>

<style scoped>
.history-refresh-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: var(--text-secondary);
  background: transparent;
  border: 0;
}

.history-refresh-btn:hover {
  color: var(--text-primary);
  background: var(--bg-secondary);
}

.history-menu {
  background: var(--bg-primary);
  border-color: color-mix(in srgb, var(--border-color) 85%, transparent);
  box-shadow:
    0 18px 48px rgb(0 0 0 / 0.35),
    0 0 0 1px rgb(255 255 255 / 0.04);
  isolation: isolate;
}

.history-item {
  display: flex;
  width: 100%;
  min-width: 0;
  flex-direction: column;
  align-items: stretch;
  gap: 2px;
  padding: 10px 12px;
  text-align: left;
  color: var(--text-primary);
  background: var(--bg-primary);
  border: 0;
  border-bottom: 1px solid color-mix(in srgb, var(--border-color) 55%, transparent);
}

.history-item:hover {
  background: color-mix(in srgb, var(--bg-secondary) 85%, var(--bg-primary));
}

.history-item:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: -2px;
}

.history-title {
  display: block;
  min-width: 0;
  font-size: 12px;
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.history-meta {
  font-size: 10px;
  color: var(--text-secondary);
}

.history-empty {
  padding: 12px;
  font-size: 12px;
  color: var(--text-secondary);
  text-align: center;
}
</style>
