import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Message, Thumbnail, InfoData, MapData } from '../types'

const generateId = (): string => {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

export const useMessageStore = defineStore('messages', () => {
  const messages = ref<Message[]>([])

  /**
   * 添加图片消息
   */
  const addImageMessage = (thumbnail: Thumbnail): string => {
    const id = generateId()
    messages.value.push({
      id,
      role: 'user',
      content: `View image: ${thumbnail.label}`,
      type: 'image',
      status: 'done',
      image: {
        url: thumbnail.imageUrl || thumbnail.thumbnailUrl || '',
        label: thumbnail.label,
        description: thumbnail.description,
        dimensions: thumbnail.dimensions,
        thumbnailId: thumbnail.id
      }
    })
    return id
  }

  /**
   * 添加 Info 消息（展示结构化数据）
   */
  const addInfoMessage = (infoData: InfoData): string => {
    const id = generateId()
    messages.value.push({
      id,
      role: 'assistant',
      content: `${infoData.title} - ${infoData.step}`,
      type: 'info',
      status: 'done',
      infoData
    })
    return id
  }

  /**
   * 添加 Map 消息（展示热力图/密度图）
   */
  const addMapMessage = (mapData: MapData): string => {
    const id = generateId()
    messages.value.push({
      id,
      role: 'assistant',
      content: `${mapData.title} - ${mapData.step}`,
      type: 'map',
      status: 'done',
      mapData
    })
    return id
  }

  /**
   * 清空所有消息
   */
  const clearMessages = () => {
    messages.value.splice(0, messages.value.length)
  }

  /**
   * 删除单条消息
   */
  const removeMessage = (id: string): void => {
    const index = messages.value.findIndex(message => message.id === id)
    if (index !== -1) {
      messages.value.splice(index, 1)
    }
  }

  return {
    messages,
    addImageMessage,
    addInfoMessage,
    addMapMessage,
    removeMessage,
    clearMessages
  }
})
