import { defineStore } from 'pinia'
import { fetchEvents, createEvent, updateEvent, deleteEvent } from '../services/api'
import socket from '../services/socket'

export const useEventStore = defineStore('events', {
  state: () => ({
    events: [],
    loading: false,
    error: null
  }),

  getters: {
    todayEvents: (state) => state.events.sort((a, b) => a.time.localeCompare(b.time))
  },

  actions: {
    async load() {
      this.loading = true
      try {
        this.events = await fetchEvents()
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    async add(eventData) {
      try {
        const event = await createEvent({ ...eventData, userId: 'default' })
        this.events.push(event)
      } catch (err) {
        this.error = err.message
      }
    },

    async update(id, data) {
      try {
        const event = await updateEvent(id, data)
        const idx = this.events.findIndex(e => e._id === id)
        if (idx !== -1) this.events[idx] = event
      } catch (err) {
        this.error = err.message
      }
    },

    async remove(id) {
      try {
        await deleteEvent(id)
        this.events = this.events.filter(e => e._id !== id)
      } catch (err) {
        this.error = err.message
      }
    },

    initSocketListeners() {
      socket.on('event:created', (event) => {
        if (!this.events.find(e => e._id === event._id)) {
          this.events.push(event)
        }
      })

      socket.on('event:updated', (event) => {
        const idx = this.events.findIndex(e => e._id === event._id)
        if (idx !== -1) this.events[idx] = event
      })

      socket.on('event:deleted', ({ id }) => {
        this.events = this.events.filter(e => e._id !== id)
      })

      socket.on('sync:events', (events) => {
        this.events = events
      })
    }
  }
})
