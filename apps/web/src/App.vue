<script setup lang="ts">
// Starts the app, then hands it to the shell.
import { onMounted, ref, shallowRef } from 'vue'
import { startApp, type App } from './app.ts'
import { t } from './i18n/index.ts'
import Shell from './Shell.vue'

const app = shallowRef<App | null>(null)
const failed = ref('')

onMounted(async () => {
  try {
    app.value = await startApp()
  } catch (e) {
    failed.value = e instanceof Error ? e.message : String(e)
  }
})
</script>

<template>
  <Shell v-if="app" :app="app" />
  <main v-else class="screen">
    <p v-if="failed" class="error">{{ t("The app couldn't start: {x}", { x: failed }) }}</p>
  </main>
</template>
