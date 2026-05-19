import { defineStore } from 'pinia'

export const useNotifStore = defineStore('notif', {
  state: () => ({
    show: false,
    header: 'SYSTEM ALERT',
    message: '',
    type: 'info' // info, success, warning, error
  }),

  actions: {
    showNotif(message, type = 'info', header = 'SYSTEM ALERT') {
      this.message = message
      this.type = type
      this.header = header
      this.show = true
      setTimeout(() => { this.show = false }, 3500)
    }
  }
})
