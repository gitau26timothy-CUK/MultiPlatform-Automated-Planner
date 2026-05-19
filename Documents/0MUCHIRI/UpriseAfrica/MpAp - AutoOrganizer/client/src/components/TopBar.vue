<template>
  <div class="topbar">
    <div class="logo">
      <div class="logo-icon">
        <svg viewBox="0 0 16 16" fill="none">
          <rect x="1" y="4" width="6" height="8" rx="1.5" fill="currentColor"/>
          <rect x="9" y="1" width="6" height="5" rx="1.5" fill="currentColor" opacity="0.6"/>
          <rect x="9" y="8" width="6" height="5" rx="1.5" fill="currentColor" opacity="0.6"/>
        </svg>
      </div>
      MAP · v2.1
    </div>

    <div class="topbar-center">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['tab', { active: activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >{{ tab.label }}</button>
    </div>

    <div class="topbar-right">
      <div class="status-dot"></div>
      <span>BT · WiFi LINKED</span>
      <div class="sync-badge">SYNC ACTIVE</div>
      <span style="font-size:11px">⊕ {{ deviceStore.onlineCount }} DEVICES</span>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useDeviceStore } from '../stores/devices'

const deviceStore = useDeviceStore()
const activeTab = ref('board')

const tabs = [
  { id: 'board', label: 'Board' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'analytics', label: 'Analytics' }
]
</script>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border);
  background: rgba(10,12,15,0.9);
  backdrop-filter: blur(12px);
  position: sticky;
  top: 0;
  z-index: 100;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: var(--accent);
  text-transform: uppercase;
}

.logo-icon {
  width: 28px;
  height: 28px;
  border: 1.5px solid var(--accent);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}
.logo-icon::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(0,212,255,0.15), transparent);
}
.logo-icon svg { width: 14px; height: 14px; }

.topbar-center { display: flex; gap: 4px; }

.tab {
  padding: 6px 14px;
  border-radius: 6px;
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  cursor: pointer;
  color: var(--muted);
  border: 1px solid transparent;
  background: none;
  transition: all 0.2s;
}
.tab:hover { color: var(--text); background: var(--bg4); }
.tab.active {
  color: var(--accent);
  background: rgba(0,212,255,0.08);
  border-color: rgba(0,212,255,0.3);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--mono);
  font-size: 10px;
  color: var(--muted);
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--green);
  box-shadow: 0 0 6px var(--green);
  animation: pulse-dot 2s ease-in-out infinite;
}

.sync-badge {
  padding: 3px 8px;
  background: rgba(0,212,255,0.08);
  border: 1px solid rgba(0,212,255,0.2);
  border-radius: 4px;
  font-size: 9px;
  letter-spacing: 0.1em;
  color: var(--accent);
}
</style>
