<template>
  <div class="app-wrapper">
    <Notification />
    <TopBar />
    <div class="main-layout">
      <LeftSidebar />
      <CenterPanel />
      <RightPanel />
    </div>
    <AIBar />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useTaskStore } from './stores/tasks'
import { useEventStore } from './stores/events'
import { useDeviceStore } from './stores/devices'
import { useAIStore } from './stores/ai'
import socket from './services/socket'

import TopBar from './components/TopBar.vue'
import LeftSidebar from './components/LeftSidebar.vue'
import CenterPanel from './components/CenterPanel.vue'
import RightPanel from './components/RightPanel.vue'
import AIBar from './components/AIBar.vue'
import Notification from './components/Notification.vue'

const taskStore = useTaskStore()
const eventStore = useEventStore()
const deviceStore = useDeviceStore()
const aiStore = useAIStore()

onMounted(async () => {
  taskStore.initSocketListeners()
  eventStore.initSocketListeners()
  deviceStore.initSocketListeners()
  aiStore.initSocketListeners()

  await Promise.all([
    taskStore.load(),
    eventStore.load(),
    deviceStore.load()
  ])
})
</script>

<style scoped>
.app-wrapper {
  position: relative;
  z-index: 1;
  padding: 0 0 60px;
}

.main-layout {
  display: grid;
  grid-template-columns: 220px 1fr 240px;
  gap: 0;
  height: calc(100vh - 53px);
}
</style>
