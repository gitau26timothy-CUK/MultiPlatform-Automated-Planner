import { io } from 'socket.io-client'

const socket = io('/', {
  transports: ['websocket', 'polling'],
  autoConnect: true
})

socket.on('connect', () => {
  console.log('[SOCKET] Connected:', socket.id)
  // Register this device with the server
  socket.emit('device:connect', {
    name: navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop Browser',
    type: navigator.userAgent.includes('Mobile') ? 'phone' : 'laptop',
    signalStrength: 4,
    connectionType: 'both'
  })
})

socket.on('disconnect', () => {
  console.log('[SOCKET] Disconnected')
})

export default socket
