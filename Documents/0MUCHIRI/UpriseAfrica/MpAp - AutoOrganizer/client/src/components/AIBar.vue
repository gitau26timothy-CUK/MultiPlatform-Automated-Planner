<template>
  <div class="ai-bar">
    <div class="ai-label">⊕ MAP AI</div>
    <div class="ai-chips">
      <div class="ai-chip" @click="runAI('Schedule my week')">Auto-schedule week</div>
      <div class="ai-chip" @click="runAI('Flag all overdue')">Flag overdue</div>
      <div class="ai-chip" @click="runAI('Set alarms for deadlines')">Alarm deadlines</div>
    </div>
    <input
      class="ai-input"
      v-model="command"
      placeholder="Ask MAP to plan, reschedule, or prioritise anything..."
      @keydown.enter="submit"
      :disabled="aiStore.processing"
    />
    <button class="ai-submit" @click="submit" :disabled="aiStore.processing">
      {{ aiStore.processing ? 'Processing...' : 'Execute ↗' }}
    </button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAIStore } from '../stores/ai'
import { useTaskStore } from '../stores/tasks'
import { useNotifStore } from '../stores/notif'

const aiStore = useAIStore()
const taskStore = useTaskStore()
const notif = useNotifStore()
const command = ref('')

async function runAI(cmd) {
  command.value = cmd
  await submit()
}

async function submit() {
  if (!command.value.trim() || aiStore.processing) return
  const cmd = command.value.trim()
  command.value = ''
  notif.showNotif(`MAP AI: Processing "${cmd}"...`, 'info', 'MAP AI')

  const result = await aiStore.execute(cmd)
  if (result.success) {
    await taskStore.load()
    notif.showNotif(`Done — ${result.message}`, 'success', 'MAP AI')
  } else {
    notif.showNotif(`Failed — ${result.message}`, 'error', 'MAP AI')
  }
}
</script>

<style scoped>
.ai-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 10px 20px;
  background: rgba(10,12,15,0.95);
  border-top: 1px solid var(--border2);
  backdrop-filter: blur(16px);
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 200;
}

.ai-label {
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
  white-space: nowrap;
}

.ai-chips { display: flex; gap: 6px; }
.ai-chip {
  padding: 6px 10px;
  background: var(--bg4);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-family: var(--mono);
  font-size: 9px;
  letter-spacing: 0.08em;
  color: var(--muted);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}
.ai-chip:hover { color: var(--accent); border-color: rgba(0,212,255,0.3); }

.ai-input {
  flex: 1;
  background: var(--bg3);
  border: 1px solid var(--border2);
  border-radius: 8px;
  padding: 8px 14px;
  color: var(--text);
  font-family: var(--mono);
  font-size: 11px;
  outline: none;
  transition: border-color 0.2s;
}
.ai-input:focus { border-color: rgba(0,212,255,0.5); }
.ai-input::placeholder { color: var(--muted); }
.ai-input:disabled { opacity: 0.5; }

.ai-submit {
  padding: 8px 16px;
  background: rgba(0,212,255,0.12);
  border: 1px solid rgba(0,212,255,0.35);
  border-radius: 8px;
  color: var(--accent);
  font-family: var(--mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}
.ai-submit:hover:not(:disabled) { background: rgba(0,212,255,0.2); }
.ai-submit:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
