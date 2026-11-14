<script setup lang="ts">
import { dismissToast, toastMessage } from './toast.ts'

function act() {
  const action = toastMessage.value?.action
  dismissToast()
  action?.run()
}
</script>

<template>
  <Transition name="fade">
    <div v-if="toastMessage" class="toast" role="status">
      <span>{{ toastMessage.text }}</span>
      <button v-if="toastMessage.action" class="act" @click="act">{{ toastMessage.action.label }}</button>
    </div>
  </Transition>
</template>

<style scoped>
.toast {
  position: fixed; left: 50%; bottom: calc(84px + env(safe-area-inset-bottom)); transform: translateX(-50%); z-index: 8;
  display: flex; align-items: center; gap: 14px; max-width: min(92vw, 408px);
  background: var(--surface-3); color: var(--text-primary); border-radius: 999px; padding: 9px 16px; font-size: 13px;
  box-shadow: var(--shadow);
}
.act { color: var(--act-text); font-weight: 500; }
</style>
