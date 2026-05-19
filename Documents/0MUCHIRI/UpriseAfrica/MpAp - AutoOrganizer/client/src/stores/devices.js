import { defineStore } from 'pinia'
import { fetchDevices, registerDevice, updateDevice, removeDevice } from '../services/api'
import socket from '../services/socket'

export const useDeviceStore = defineStore('devices', {
  state: () => ({
    devices: [],
    connectedDevices: [],
    loading: false,
    error: null
  }),

  getters: {
    onlineCount: (state) => state.connectedDevices.length,
    totalCount: (state) => state.devices.length
  },

  actions: {
    async load() {
      this.loading = true
      try {
        this.devices = await fetchDevices()
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    async register(data) {
      try {
        const device = await registerDevice({ ...data, userId: 'default' })
        this.devices.push(device)
      } catch (err) {
        this.error = err.message
      }
    },

    async update(id, data) {
      try {
        const device = await updateDevice(id, data)
        const idx = this.devices.findIndex(d => d._id === id)
        if (idx !== -1) this.devices[idx] = device
      } catch (err) {
        this.error = err.message
      }
    },

    async remove(id) {
      try {
        await removeDevice(id)
        this.devices = this.devices.filter(d => d._id !== id)
      } catch (err) {
        this.error = err.message
      }
    },

    initSocketListeners() {
      socket.on('devices:list', (devices) => {
        this.connectedDevices = devices
      })

      socket.on('device:registered', (device) => {
        if (!this.devices.find(d => d._id === device._id)) {
          this.devices.push(device)
        }
      })

      socket.on('device:updated', (device) => {
        const idx = this.devices.findIndex(d => d._id === device._id)
        if (idx !== -1) this.devices[idx] = device
      })

      socket.on('device:removed', ({ id }) => {
        this.devices = this.devices.filter(d => d._id !== id)
      })
    }
  }
})
