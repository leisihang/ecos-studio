import { nextTick, ref, type Ref } from 'vue'

export function useAgentInputHistory(inputValue: Ref<string>) {
  const promptHistory = ref<string[]>([])
  const promptHistoryIndex = ref<number | null>(null)
  const draftPrompt = ref('')

  const recordPrompt = (prompt: string) => {
    promptHistory.value = [
      prompt,
      ...promptHistory.value.filter(item => item !== prompt),
    ].slice(0, 50)
    promptHistoryIndex.value = null
    draftPrompt.value = ''
  }

  const handleHistoryKeyDown = (e: KeyboardEvent) => {
    if (e.isComposing || e.key === 'Process') {
      return false
    }

    if (!(e.target instanceof HTMLTextAreaElement)) {
      return false
    }

    const target = e.target

    if (e.key === 'ArrowUp' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
      if (
        target.selectionStart !== 0
        || target.selectionEnd !== 0
        || promptHistory.value.length === 0
      ) {
        return false
      }

      e.preventDefault()
      if (promptHistoryIndex.value === null) {
        draftPrompt.value = inputValue.value
        promptHistoryIndex.value = 0
      } else {
        promptHistoryIndex.value = Math.min(
          promptHistoryIndex.value + 1,
          promptHistory.value.length - 1,
        )
      }
      inputValue.value = promptHistory.value[promptHistoryIndex.value] ?? ''
      nextTick(() => {
        target.setSelectionRange(inputValue.value.length, inputValue.value.length)
      })
      return true
    }

    if (e.key === 'ArrowDown' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
      if (
        promptHistoryIndex.value === null
        || target.selectionStart !== inputValue.value.length
        || target.selectionEnd !== inputValue.value.length
      ) {
        return false
      }

      e.preventDefault()
      if (promptHistoryIndex.value <= 0) {
        promptHistoryIndex.value = null
        inputValue.value = draftPrompt.value
        draftPrompt.value = ''
      } else {
        promptHistoryIndex.value -= 1
        inputValue.value = promptHistory.value[promptHistoryIndex.value] ?? ''
      }
      nextTick(() => {
        target.setSelectionRange(inputValue.value.length, inputValue.value.length)
      })
      return true
    }

    return false
  }

  return {
    handleHistoryKeyDown,
    recordPrompt,
  }
}
