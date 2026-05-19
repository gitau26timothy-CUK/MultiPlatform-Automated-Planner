<template>
  <div class="sidebar-left">
    <!-- Profile -->
    <div class="sidebar-section">
      <div class="profile-card">
        <div class="profile-avatar">AK</div>
        <div class="profile-name">Alex K.</div>
        <div class="profile-role">Multi-mode user</div>
        <div class="mode-chips">
          <span
            v-for="mode in modes"
            :key="mode.id"
            :class="['mode-chip', mode.id, { active: mode.active }]"
            @click="mode.active = !mode.active"
          >{{ mode.label }}</span>
        </div>
      </div>
    </div>

    <!-- Navigation -->
    <div class="sidebar-section">
      <div class="sidebar-label">Navigation</div>
      <div
        v-for="nav in navItems"
        :key="nav.label"
        :class="['nav-item', { active: activeNav === nav.label }]"
        @click="activeNav = nav.label"
      >
        <span class="nav-icon">{{ nav.icon }}</span>
        {{ nav.label }}
        <span v-if="nav.count" :class="['nav-badge', { green: nav.green }]">{{ nav.count }}</span>
      </div>
    </div>

    <!-- Linked Devices -->
    <div class="sidebar-section">
      <div class="sidebar-label">Linked Devices</div>
      <div class="device-status">
        <div v-for="device in deviceStore.connectedDevices" :key="device.name" class="device-row">
          <span class="device-name">{{ device.name }}</span>
          <div class="device-signal">
            <div
              v-for="i in 4"
              :key="i"
              :class="['sig-bar', i <= device.signalStrength ? 'on' : 'off']"
              :style="{ height: (3 + i * 3) + 'px' }"
            ></div>
          </div>
        </div>
        <div v-if="deviceStore.connectedDevices.length === 0" class="device-row">
          <span class="device-name" style="color: var(--amber)">No devices connected</span>
        </div>
        <div class="device-protocol">
          <span>Protocol</span>
          <span style="color: var(--accent)">BT 5.3 + WiFi 6</span>
        </div>
      </div>
    </div>

    <!-- Calendar Sources -->
    <div class="sidebar-section">
      <div class="sidebar-label">Cal Sources</div>
      <div v-for="cal in calSources" :key="cal.name" class="nav-item">
        <span :style="{ width:'8px', height:'8px', borderRadius:'50%', background:cal.color, display:'inline-block' }"></span>
        {{ cal.name }}
        <span class="nav-badge green">{{ cal.status }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useDeviceStore } from '../stores/devices'

const deviceStore = useDeviceStore()
const activeNav = ref('Dashboard')

const modes = reactive([
  { id: 'uni', label: 'UNI', active: true },
  { id: 'stem', label: 'STEM', active: true },
  { id: 'crypto', label: 'CRYPTO', active: true }
])

const navItems = [
  { icon: '◈', label: 'Dashboard', count: null, green: false },
  { icon: '◰', label: 'Assignments', count: 4, green: false },
  { icon: '◷', label: 'Deadlines', count: 2, green: false },
  { icon: '◈', label: 'Projects', count: 7, green: true },
  { icon: '◑', label: 'Events', count: null, green: false },
  { icon: '⊚', label: 'Alarms', count: null, green: false },
  { icon: '⊡', label: 'Integrations', count: null, green: false }
]

const calSources = [
  { name: 'Google Cal', color: '#7c3aed', status: 'LIVE' },
  { name: 'Outlook', color: '#00d4ff', status: 'LIVE' },
  { name: 'iCal / Apple', color: '#10b981', status: 'LIVE' }
]
</script>

<style scoped>
.sidebar-left {
  border-right: 1px solid var(--border);
  padding: 16px 0;
  overflow-y: auto;
  background: var(--bg2);
}

.sidebar-section { margin-bottom: 24px; }

.sidebar-label {
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
  padding: 0 16px;
  margin-bottom: 8px;
}

.profile-card {
  margin: 0 12px 16px;
  padding: 12px;
  background: var(--bg4);
  border: 1px solid var(--border2);
  border-radius: 10px;
}

.profile-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent2), var(--accent));
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 13px;
  margin-bottom: 8px;
}

.profile-name { font-weight: 600; font-size: 13px; margin-bottom: 2px; }
.profile-role {
  font-family: var(--mono);
  font-size: 9px;
  color: var(--accent);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.mode-chips { display: flex; gap: 4px; margin-top: 8px; flex-wrap: wrap; }
.mode-chip {
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 9px;
  font-family: var(--mono);
  letter-spacing: 0.08em;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s;
}
.mode-chip.uni    { background: rgba(124,58,237,0.15); border-color: rgba(124,58,237,0.35); color: #a78bfa; }
.mode-chip.stem   { background: rgba(16,185,129,0.12); border-color: rgba(16,185,129,0.3); color: #34d399; }
.mode-chip.crypto { background: rgba(245,158,11,0.12); border-color: rgba(245,158,11,0.3); color: #fbbf24; }
.mode-chip.active { opacity: 1; }
.mode-chip:not(.active) { opacity: 0.45; }

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 16px;
  cursor: pointer;
  transition: all 0.15s;
  border-left: 2px solid transparent;
  color: var(--muted);
  font-size: 13px;
}
.nav-item:hover { background: var(--bg4); color: var(--text); border-left-color: var(--border2); }
.nav-item.active { background: rgba(0,212,255,0.06); color: var(--accent); border-left-color: var(--accent); }

.nav-icon { width: 16px; text-align: center; font-size: 13px; }
.nav-badge {
  margin-left: auto;
  padding: 1px 7px;
  border-radius: 20px;
  font-family: var(--mono);
  font-size: 9px;
  background: rgba(239,68,68,0.2);
  border: 1px solid rgba(239,68,68,0.35);
  color: #fca5a5;
}
.nav-badge.green {
  background: rgba(16,185,129,0.15);
  border-color: rgba(16,185,129,0.3);
  color: #6ee7b7;
}

.device-status {
  margin: 0 12px;
  padding: 10px 12px;
  background: var(--bg4);
  border: 1px solid var(--border2);
  border-radius: 8px;
}
.device-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 0;
  font-family: var(--mono);
  font-size: 10px;
}
.device-name { color: var(--muted); letter-spacing: 0.06em; }
.device-signal { display: flex; gap: 2px; align-items: flex-end; }
.sig-bar { width: 3px; border-radius: 1px; }
.sig-bar.on { background: var(--green); }
.sig-bar.off { background: var(--border2); }
.device-protocol {
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
  font-family: var(--mono);
  font-size: 9px;
  color: var(--muted);
}
</style>
