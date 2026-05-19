<template>
  <div
    :class="['task-card', `priority-${task.priority}`]"
    draggable="true"
    @dragstart="$emit('dragstart')"
    @dragend="$emit('dragend')"
  >
    <div :class="['task-tag', tagMap[task.tag]]">{{ tagLabel[task.tag] }}</div>
    <div class="task-title">{{ task.title }}</div>
    <div class="task-progress">
      <div class="task-progress-bar" :style="{ width: task.progress + '%' }"></div>
    </div>
    <div class="task-assignees">
      <div class="avatar-stack">
        <div
          v-for="(av, i) in task.avatars"
          :key="i"
          class="avatar-mini"
          :style="{ background: avatarColors[i % 5] }"
        >{{ av }}</div>
      </div>
      <div v-if="task.alarm" class="alarm-chip">🔔 alarm</div>
    </div>
    <div class="task-meta">
      <div :class="['task-due', { urgent: task.due?.toLowerCase() === 'today' }]">⊕ {{ task.due }}</div>
      <div>{{ task.progress }}% complete</div>
      <div style="margin-left:auto; display:flex; gap:6px;">
        <span class="task-action" @click.stop="toggleAlarm" title="Toggle alarm">⊚</span>
        <span class="task-action delete" @click.stop="removeTask" title="Delete">✕</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useTaskStore } from '../stores/tasks'
import { useNotifStore } from '../stores/notif'

const props = defineProps({ task: Object })
defineEmits(['dragstart', 'dragend'])

const taskStore = useTaskStore()
const notif = useNotifStore()

const tagMap = {
  assignment: 'tag-assignment',
  deadline: 'tag-deadline',
  project: 'tag-project',
  event: 'tag-event',
  crypto: 'tag-crypto'
}

const tagLabel = {
  assignment: 'Assignment',
  deadline: 'Deadline',
  project: 'Project',
  event: 'Event',
  crypto: 'Crypto'
}

const avatarColors = ['#7c3aed', '#059669', '#d97706', '#dc2626', '#0ea5e9']

async function toggleAlarm() {
  const result = await taskStore.toggleAlarm(props.task._id)
  if (result) {
    notif.showNotif(
      result.alarm ? `Alarm set: ${result.title} — all devices` : `Alarm removed: ${result.title}`,
      result.alarm ? 'success' : 'info'
    )
  }
}

async function removeTask() {
  await taskStore.remove(props.task._id)
  notif.showNotif(`Task removed: ${props.task.title}`, 'info')
}
</script>

<style scoped>
.task-card {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px;
  cursor: grab;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
}
.task-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 3px;
  height: 100%;
}
.task-card.priority-high::before { background: var(--red); }
.task-card.priority-mid::before  { background: var(--amber); }
.task-card.priority-low::before  { background: var(--green); }
.task-card.priority-crypto::before { background: var(--pink); }

.task-card:hover {
  border-color: var(--border2);
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}
.task-card:active { cursor: grabbing; }

.task-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 4px;
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.08em;
  margin-bottom: 7px;
}
.tag-assignment { background: rgba(124,58,237,0.15); color: #a78bfa; border: 1px solid rgba(124,58,237,0.3); }
.tag-deadline   { background: rgba(239,68,68,0.12);   color: #fca5a5; border: 1px solid rgba(239,68,68,0.3); }
.tag-project    { background: rgba(16,185,129,0.12);  color: #6ee7b7; border: 1px solid rgba(16,185,129,0.3); }
.tag-event      { background: rgba(0,212,255,0.1);    color: var(--accent); border: 1px solid rgba(0,212,255,0.25); }
.tag-crypto     { background: rgba(245,158,11,0.12);  color: #fbbf24; border: 1px solid rgba(245,158,11,0.3); }

.task-title { font-weight: 600; font-size: 13px; margin-bottom: 4px; line-height: 1.35; }

.task-progress {
  margin-top: 8px;
  height: 3px;
  background: var(--bg4);
  border-radius: 2px;
  overflow: hidden;
}
.task-progress-bar {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--accent2), var(--accent));
  transition: width 0.3s;
}

.task-assignees {
  display: flex;
  margin-top: 8px;
  justify-content: space-between;
  align-items: center;
}
.avatar-stack { display: flex; }
.avatar-mini {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1.5px solid var(--bg2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  font-weight: 700;
  margin-left: -5px;
}
.avatar-mini:first-child { margin-left: 0; }

.alarm-chip {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 2px 6px;
  background: rgba(245,158,11,0.1);
  border: 1px solid rgba(245,158,11,0.25);
  border-radius: 4px;
  font-family: var(--mono);
  font-size: 9px;
  color: #fbbf24;
}

.task-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--mono);
  font-size: 9px;
  color: var(--muted);
  margin-top: 8px;
}
.task-due { display: flex; align-items: center; gap: 3px; }
.task-due.urgent { color: #fca5a5; }

.task-action {
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.15s;
  font-size: 11px;
}
.task-action:hover { opacity: 1; color: var(--accent); }
.task-action.delete:hover { color: var(--red); }
</style>
