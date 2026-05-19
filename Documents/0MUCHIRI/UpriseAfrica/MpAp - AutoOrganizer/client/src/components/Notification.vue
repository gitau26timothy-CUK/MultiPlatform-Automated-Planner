<template>
  <div v-if="notif.show" class="notif">
    <div class="notif-header">{{ notif.header }}</div>
    <div class="notif-msg">{{ notif.message }}</div>
  </div>
</template>

<script setup>
import { useNotifStore } from '../stores/notif'
const notif = useNotifStore()
</script>

<style scoped>
.notif {
  position: fixed;
  top: 70px;
  right: 16px;
  background: var(--bg3);
  border: 1px solid rgba(0,212,255,0.3);
  border-radius: 10px;
  padding: 12px 16px;
  font-size: 12px;
  max-width: 280px;
  z-index: 300;
  box-shadow: 0 4px 32px rgba(0,212,255,0.1);
  animation: slide-in 0.3s ease-out;
}
.notif-header {
  font-family: var(--mono);
  font-size: 9px;
  color: var(--accent);
  letter-spacing: 0.12em;
  margin-bottom: 5px;
  text-transform: uppercase;
}
.notif-msg {
  line-height: 1.4;
}
</style>
