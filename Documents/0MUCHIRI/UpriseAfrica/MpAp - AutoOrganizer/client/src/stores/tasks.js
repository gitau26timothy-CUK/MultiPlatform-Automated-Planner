import { defineStore } from 'pinia'
import { fetchTasks, createTask, updateTask, deleteTask, toggleAlarm, reorderTasks } from '../services/api'
import socket from '../services/socket'

export const useTaskStore = defineStore('tasks', {
  state: () => ({
    tasks: [],
    loading: false,
    error: null
  }),

  getters: {
    byColumn: (state) => (col) => state.tasks.filter(t => t.column === col).sort((a, b) => a.order - b.order),
    activeCount: (state) => state.tasks.filter(t => t.column < 3).length,
    overdueCount: (state) => state.tasks.filter(t => t.due?.toLowerCase() === 'today' || t.due?.toLowerCase() === 'overdue').length,
    completedCount: (state) => state.tasks.filter(t => t.column === 3).length,
    upcomingCount: (state) => state.tasks.filter(t => t.column < 3 && t.due !== 'TBD').length
  },

  actions: {
    async load() {
      this.loading = true
      try {
        this.tasks = await fetchTasks()
      } catch (err) {
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    async add(taskData) {
      try {
        const task = await createTask({
          ...taskData,
          userId: 'default',
          order: this.tasks.filter(t => t.column === taskData.column).length
        })
        this.tasks.push(task)
      } catch (err) {
        this.error = err.message
      }
    },

    async update(id, data) {
      try {
        const task = await updateTask(id, data)
        const idx = this.tasks.findIndex(t => t._id === id)
        if (idx !== -1) this.tasks[idx] = task
      } catch (err) {
        this.error = err.message
      }
    },

    async remove(id) {
      try {
        await deleteTask(id)
        this.tasks = this.tasks.filter(t => t._id !== id)
      } catch (err) {
        this.error = err.message
      }
    },

    async toggleAlarm(id) {
      try {
        const task = await toggleAlarm(id)
        const idx = this.tasks.findIndex(t => t._id === id)
        if (idx !== -1) this.tasks[idx] = task
        return task
      } catch (err) {
        this.error = err.message
      }
    },

    async moveTask(id, newColumn) {
      try {
        const task = this.tasks.find(t => t._id === id)
        if (!task) return
        const oldCol = task.column
        task.column = newColumn
        task.order = this.tasks.filter(t => t.column === newColumn).length
        await updateTask(id, { column: newColumn, order: task.order })
      } catch (err) {
        this.error = err.message
      }
    },

    // Listen for socket updates
    initSocketListeners() {
      socket.on('task:created', (task) => {
        if (!this.tasks.find(t => t._id === task._id)) {
          this.tasks.push(task)
        }
      })

      socket.on('task:updated', (task) => {
        const idx = this.tasks.findIndex(t => t._id === task._id)
        if (idx !== -1) this.tasks[idx] = task
      })

      socket.on('task:deleted', ({ id }) => {
        this.tasks = this.tasks.filter(t => t._id !== id)
      })

      socket.on('sync:tasks', (tasks) => {
        this.tasks = tasks
      })
    }
  }
})
