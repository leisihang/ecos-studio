import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia, storeToRefs } from 'pinia'
import { nextTick } from 'vue'
import { useMessageStore } from './messageStore'

describe('messageStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('clears all in-memory structured messages', () => {
    const store = useMessageStore()

    store.addInfoMessage({
      title: 'Chip basic info',
      step: 'home',
      items: [],
    })
    store.addMapMessage({
      title: 'Placement density',
      step: 'place',
      imageUrl: '/tmp/place.png',
      info: [],
      localPath: '/tmp/place.png',
    })

    expect(store.messages.map(message => message.type)).toEqual(['info', 'map'])

    store.clearMessages()

    expect(store.messages).toEqual([])
  })

  it('keeps storeToRefs consumers reactive when messages are cleared', async () => {
    const store = useMessageStore()
    const { messages } = storeToRefs(store)

    store.addImageMessage({
      id: 1,
      label: 'Layout preview',
      thumbnailUrl: '/tmp/layout.png',
    })
    expect(messages.value).toHaveLength(1)

    store.clearMessages()
    await nextTick()

    expect(messages.value).toEqual([])
  })
})
