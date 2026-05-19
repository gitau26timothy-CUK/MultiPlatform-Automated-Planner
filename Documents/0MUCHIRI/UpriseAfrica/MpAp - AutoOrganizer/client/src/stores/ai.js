import { defineStore } from 'pinia'
import { executeAI } from '../services/api'
import socket from '../services/socket'

export const useAIStore = defineStore('ai', {
  state: () => ({
    processing: false,
    lastResult: null,
    history: []
  }),

  actions: {
    async execute(command) {
      this.processing = true
      this.lastResult = null
      try {
        const result = await executeAI(command)
        this.lastResult = result
        this.history.push({ command, result, timestamp: new Date() })
        return result
      } catch (err) {
        this.lastResult = { success: false, message: err.message }
        return this.lastResult
      } finally {
        this.processing = false
      }
    },

    initSocketListeners() {
      socket.on('ai:result', (result) => {
        this.lastResult = result
      })
    }
  }
})
