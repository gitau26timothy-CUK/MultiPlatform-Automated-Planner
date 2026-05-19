<template>
  <div class="center">
    <!-- Panel Header -->
    <div class="panel-header">
      <div>
        <div class="panel-title">Mission Board</div>
        <div class="panel-subtitle">↓ drag to reorder · auto-syncs across all devices</div>
      </div>
      <div class="header-actions">
        <button class="btn" @click="setAlarms">⊚ Set Alarms</button>
        <button class="btn primary" @click="showAddTask = true">+ New Task</button>
      </div>
    </div>

    <!-- Calendar Strip -->
    <div class="cal-strip">
      <div
        v-for="day in calDays"
        :key="day.dateStr"
        :class="['cal-day', { today: day.isToday, 'has-event': day.hasEvent }]"
      >
        <div class="cal-day-name">{{ day.name }}</div>
        <div class="cal-day-num">{{ day.num }}</div>
      </div>
    </div>

    <!-- Board Columns -->
    <div class="board">
      <div v-for="col in columns" :key="col.id">
        <div class="col-header">
          <div class="col-title">
            <div class="col-dot" :style="{ background: col.color }"></div>
            {{ col.label }}
            <span class="col-count">({{ taskStore.byColumn(col.id).length }})</span>
          </div>
          <span class="col-add" @click="addTaskToCol(col.id)">+</span>
        </div>
        <div
          :class="['column', { 'drag-over': dragOverCol === col.id }]"
          @dragover.prevent="dragOverCol = col.id"
          @dragleave="dragOverCol = null"
          @drop="onDrop($event, col.id)"
        >
          <TaskCard
            v-for="task in taskStore.byColumn(col.id)"
            :key="task._id"
            :task="task"
            draggable="true"
            @dragstart="onDragStart(task._id)"
            @dragend="onDragEnd"
          />
        </div>
      </div>
    </div>

    <!-- Add Task Modal -->
    <div v-if="showAddTask" class="modal-overlay" @click.self="showAddTask = false">
      <div class="modal">
        <div class="modal-header">New Task</div>
        <input v-model="newTask.title" class="modal-input" placeholder="Task title..." />
        <div class="modal-row">
          <select v-model="newTask.tag" class="modal-select">
            <option value="assignment">Assignment</option>
            <option value="deadline">Deadline</option>
            <option value="project">Project</option>
            <option value="event">Event</option>
            <option value="crypto">Crypto</option>
          </select>
          <select v-model="newTask.priority" class="modal-select">
            <option value="high">High</option>
            <option value="mid">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <input v-model="newTask.due" class="modal-input" placeholder="Due date (e.g. May 3, TODAY)" />
        <div class="modal-actions">
          <button class="btn" @click="showAddTask = false">Cancel</button>
          <button class="btn primary" @click="createTask">Create</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useTaskStore } from '../stores/tasks'
import { useNotifStore } from '../stores/notif'
import TaskCard from './TaskCard.vue'

const taskStore = useTaskStore()
const notif = useNotifStore()

const dragId = ref(null)
const dragOverCol = ref(null)
const showAddTask = ref(false)
const addTaskCol = ref(1)

const newTask = reactive({
  title: '',
  tag: 'project',
  priority: 'mid',
  due: 'TBD'
})

const columns = [
  { id: 0, label: 'BACKLOG', color: '#6b7280' },
  { id: 1, label: 'TO DO', color: 'var(--accent)' },
  { id: 2, label: 'IN PROGRESS', color: 'var(--amber)' },
  { id: 3, label: 'DONE', color: 'var(--green)' }
]

const calDays = computed(() => {
  const days = ['SUN','MON','TUE','WED','THU','FRI','SAT']
  const result = []
  for (let i = 0; i < 14; i++) {
    const d = new Date()
    d.setDate(d.getDate() - 2 + i)
    result.push({
      dateStr: d.toISOString().slice(0, 10),
      num: d.getDate(),
      name: days[d.getDay()],
      isToday: i === 2,
      hasEvent: [28, 29, 30, 2, 5].includes(d.getDate())
    })
  }
  return result
})

function onDragStart(id) {
  dragId.value = id
}

function onDragEnd() {
  dragId.value = null
  dragOverCol.value = null
}

function onDrop(event, col) {
  event.preventDefault()
  if (dragId.value) {
    taskStore.moveTask(dragId.value, col)
    dragId.value = null
    dragOverCol.value = null
  }
}

function addTaskToCol(col) {
  addTaskCol.value = col
  newTask.title = ''
  newTask.tag = 'project'
  newTask.priority = 'mid'
  newTask.due = 'TBD'
  showAddTask.value = true
}

async function createTask() {
  if (!newTask.title.trim()) return
  await taskStore.add({
    title: newTask.title,
    tag: newTask.tag,
    priority: newTask.priority,
    due: newTask.due,
    column: addTaskCol.value,
    progress: 0,
    avatars: ['AK'],
    alarm: false
  })
  showAddTask.value = false
  notif.showNotif(`Task created: ${newTask.title}`, 'success')
}

async function setAlarms() {
  const overdue = taskStore.tasks.filter(t =>
    t.alarm === false && t.column < 3 &&
    (t.due?.toLowerCase() === 'today' || t.due?.toLowerCase() === 'overdue')
  )
  for (const t of overdue) {
    await taskStore.toggleAlarm(t._id)
  }
  notif.showNotif(`Alarms set for ${overdue.length} overdue tasks across all devices`, 'success')
}
</script>

<style scoped>
.center { overflow-y: auto; background: var(--bg); }

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--border);
  background: var(--bg2);
}
.panel-title { font-weight: 700; font-size: 16px; letter-spacing: -0.02em; }
.panel-subtitle {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--muted);
  margin-top: 2px;
  letter-spacing: 0.08em;
}
.header-actions { display: flex; gap: 8px; }

.btn {
  padding: 7px 14px;
  border-radius: 7px;
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  border: 1px solid var(--border2);
  background: var(--bg4);
  color: var(--text);
  transition: all 0.15s;
}
.btn:hover { background: var(--bg3); border-color: var(--border); }
.btn.primary {
  background: rgba(0,212,255,0.12);
  border-color: rgba(0,212,255,0.4);
  color: var(--accent);
}
.btn.primary:hover { background: rgba(0,212,255,0.2); }

.cal-strip {
  display: flex;
  gap: 6px;
  padding: 14px 20px;
  overflow-x: auto;
  border-bottom: 1px solid var(--border);
  scrollbar-width: none;
}
.cal-strip::-webkit-scrollbar { display: none; }

.cal-day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  min-width: 48px;
  border: 1px solid transparent;
  transition: all 0.15s;
}
.cal-day:hover { background: var(--bg4); }
.cal-day.today {
  background: rgba(0,212,255,0.08);
  border-color: rgba(0,212,255,0.3);
}
.cal-day.has-event::after {
  content: '';
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
}
.cal-day-name { font-family: var(--mono); font-size: 9px; color: var(--muted); letter-spacing: 0.12em; }
.cal-day-num { font-weight: 700; font-size: 16px; }
.cal-day.today .cal-day-num { color: var(--accent); }

.board {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  padding: 16px 20px;
}

.col-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.col-title {
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 6px;
}
.col-dot { width: 7px; height: 7px; border-radius: 50%; }
.col-count { color: var(--muted); }
.col-add {
  color: var(--muted);
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  transition: color 0.15s;
}
.col-add:hover { color: var(--accent); }

.column {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 400px;
  transition: all 0.15s;
}
.column.drag-over {
  background: rgba(0,212,255,0.03);
  border: 1px dashed rgba(0,212,255,0.2);
  border-radius: 10px;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 500;
}
.modal {
  background: var(--bg3);
  border: 1px solid var(--border2);
  border-radius: 12px;
  padding: 20px;
  width: 400px;
  max-width: 90vw;
}
.modal-header {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 16px;
}
.modal-input {
  width: 100%;
  background: var(--bg4);
  border: 1px solid var(--border2);
  border-radius: 7px;
  padding: 10px 14px;
  color: var(--text);
  font-family: var(--mono);
  font-size: 12px;
  outline: none;
  margin-bottom: 10px;
  transition: border-color 0.2s;
}
.modal-input:focus { border-color: rgba(0,212,255,0.5); }
.modal-row { display: flex; gap: 8px; margin-bottom: 10px; }
.modal-select {
  flex: 1;
  background: var(--bg4);
  border: 1px solid var(--border2);
  border-radius: 7px;
  padding: 8px 12px;
  color: var(--text);
  font-family: var(--mono);
  font-size: 11px;
  outline: none;
}
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 12px; }
</style>
