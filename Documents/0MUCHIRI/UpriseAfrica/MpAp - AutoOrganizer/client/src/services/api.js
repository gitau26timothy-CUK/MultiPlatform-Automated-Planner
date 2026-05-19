import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

// ── Tasks ──
export const fetchTasks = () => api.get('/tasks').then(r => r.data)
export const createTask = (data) => api.post('/tasks', data).then(r => r.data)
export const updateTask = (id, data) => api.put(`/tasks/${id}`, data).then(r => r.data)
export const deleteTask = (id) => api.delete(`/tasks/${id}`).then(r => r.data)
export const toggleAlarm = (id) => api.put(`/tasks/${id}/alarm`).then(r => r.data)
export const reorderTasks = (updates) => api.post('/tasks/reorder', { updates }).then(r => r.data)

// ── Events ──
export const fetchEvents = () => api.get('/events').then(r => r.data)
export const createEvent = (data) => api.post('/events', data).then(r => r.data)
export const updateEvent = (id, data) => api.put(`/events/${id}`, data).then(r => r.data)
export const deleteEvent = (id) => api.delete(`/events/${id}`).then(r => r.data)

// ── Devices ──
export const fetchDevices = () => api.get('/devices').then(r => r.data)
export const registerDevice = (data) => api.post('/devices', data).then(r => r.data)
export const updateDevice = (id, data) => api.put(`/devices/${id}`, data).then(r => r.data)
export const removeDevice = (id) => api.delete(`/devices/${id}`).then(r => r.data)

// ── AI ──
export const executeAI = (command) => api.post('/ai', { command }).then(r => r.data)

// ── Health ──
export const checkHealth = () => api.get('/health').then(r => r.data)

export default api
