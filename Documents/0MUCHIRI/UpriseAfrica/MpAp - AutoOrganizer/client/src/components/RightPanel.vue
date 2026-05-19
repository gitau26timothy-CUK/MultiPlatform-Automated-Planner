<template>
  <div class="sidebar-right">
    <!-- Productivity Stats -->
    <div class="panel-card">
      <div class="panel-card-header">
        <span>Productivity</span>
        <span style="color:var(--green)">↑ 12%</span>
      </div>
      <div class="stats-grid">
        <div class="stat-box">
          <div class="stat-val accent">{{ taskStore.activeCount }}</div>
          <div class="stat-label">Active</div>
        </div>
        <div class="stat-box">
          <div class="stat-val red">{{ taskStore.overdueCount }}</div>
          <div class="stat-label">Overdue</div>
        </div>
        <div class="stat-box">
          <div class="stat-val green">{{ taskStore.completedCount }}</div>
          <div class="stat-label">Completed</div>
        </div>
        <div class="stat-box">
          <div class="stat-val amber">{{ taskStore.upcomingCount }}</div>
          <div class="stat-label">Upcoming</div>
        </div>
      </div>
    </div>

    <!-- Today's Schedule -->
    <div class="panel-card">
      <div class="panel-card-header">
        <span>Today's Schedule</span>
        <span>↺ synced</span>
      </div>
      <div
        v-for="event in eventStore.todayEvents"
        :key="event._id"
        class="event-item"
      >
        <div class="event-time">{{ event.time }}</div>
        <div class="event-dot" :style="{ background: event.color }"></div>
        <div class="event-info">
          <div class="event-name">{{ event.title }}</div>
          <div class="event-detail">{{ event.detail }}</div>
        </div>
      </div>
      <div v-if="eventStore.todayEvents.length === 0" class="event-empty">
        No events scheduled
      </div>
    </div>

    <!-- Crypto Tracker — Coming Soon -->
    <div class="panel-card coming-soon">
      <div class="panel-card-header">
        <span>Crypto Tracker</span>
        <span class="coming-badge">COMING SOON</span>
      </div>
      <div class="coming-soon-content">
        <div class="coming-icon">🚀</div>
        <div class="coming-text">Real-time crypto portfolio tracking</div>
        <div class="coming-sub">BTC · ETH · SOL · ADA and more</div>
      </div>
    </div>

    <!-- Sync Protocol -->
    <div class="panel-card">
      <div class="panel-card-header"><span>Sync Protocol</span></div>
      <div class="sync-info">
        <div>Mode: <span style="color:var(--accent)">BT 5.3 + WiFi 6E</span></div>
        <div>Latency: <span style="color:var(--green)">~4ms</span></div>
        <div>Alarm sync: <span style="color:var(--green)">All devices</span></div>
        <div>Cal scrape: <span style="color:var(--green)">Every 5min</span></div>
        <div>Encryption: <span style="color:var(--accent2)">AES-256</span></div>
        <div>Offline mode: <span style="color:var(--amber)">Queued</span></div>
        <div>Connected: <span style="color:var(--green)">{{ deviceStore.onlineCount }} devices</span></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useTaskStore } from '../stores/tasks'
import { useEventStore } from '../stores/events'
import { useDeviceStore } from '../stores/devices'

const taskStore = useTaskStore()
const eventStore = useEventStore()
const deviceStore = useDeviceStore()
</script>

<style scoped>
.sidebar-right {
  border-left: 1px solid var(--border);
  background: var(--bg2);
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.panel-card {
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
}

.panel-card-header {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 12px;
}
.stat-box {
  background: var(--bg4);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px;
}
.stat-val { font-size: 22px; font-weight: 700; letter-spacing: -0.03em; }
.stat-val.accent { color: var(--accent); }
.stat-val.green  { color: var(--green); }
.stat-val.amber  { color: var(--amber); }
.stat-val.red    { color: var(--red); }
.stat-label {
  font-family: var(--mono);
  font-size: 9px;
  color: var(--muted);
  letter-spacing: 0.1em;
  margin-top: 2px;
  text-transform: uppercase;
}

.event-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  transition: background 0.15s;
}
.event-item:hover { background: var(--bg4); }
.event-item:last-child { border-bottom: none; }
.event-time { font-family: var(--mono); font-size: 10px; color: var(--muted); min-width: 40px; }
.event-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 3px; flex-shrink: 0; }
.event-name { font-size: 12px; font-weight: 500; margin-bottom: 2px; }
.event-detail { font-family: var(--mono); font-size: 9px; color: var(--muted); }
.event-empty {
  padding: 20px 14px;
  text-align: center;
  font-family: var(--mono);
  font-size: 10px;
  color: var(--muted);
}

/* Coming Soon */
.coming-soon { border-color: rgba(245,158,11,0.15); }
.coming-badge {
  padding: 2px 7px;
  background: rgba(245,158,11,0.12);
  border: 1px solid rgba(245,158,11,0.3);
  border-radius: 4px;
  color: #fbbf24;
  font-size: 8px;
}
.coming-soon-content {
  padding: 20px 14px;
  text-align: center;
}
.coming-icon { font-size: 28px; margin-bottom: 8px; }
.coming-text {
  font-family: var(--mono);
  font-size: 11px;
  color: var(--text);
  margin-bottom: 4px;
}
.coming-sub {
  font-family: var(--mono);
  font-size: 9px;
  color: var(--muted);
  letter-spacing: 0.08em;
}

.sync-info {
  padding: 12px 14px;
  font-family: var(--mono);
  font-size: 10px;
  color: var(--muted);
  line-height: 1.8;
}
</style>
