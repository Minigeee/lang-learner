<script setup lang="ts">
// Settings (app-ui-flow Navigation, behind the profile icon). Study settings and the support language
// are synced `setting` events; sync status, the dead letters, notes, the manual export and the restore
// (README Stack row, Backups), and Credits.
import { computed, onMounted, ref } from 'vue'
import { IconArrowLeft, IconChevronRight, IconDownload, IconUpload } from '@tabler/icons-vue'
import type { EventOf, Rejection, SettingPayload } from '@lang-learner/core'
import { exportLog, exportName } from '../adapters/backup.ts'
import { useApp } from '../app.ts'
import { t } from '../i18n/index.ts'
import { toast } from '../parts/toast.ts'
import { useRouter } from '../router.ts'

const app = useApp()
const { content, settings, sync, events } = app
const router = useRouter(content.manifest.lang)
const BUDGETS = [5, 10, 15, 20, 30, 45, 60]
const HOURS = Array.from({ length: 24 }, (_, h) => h)
const deviceTz = Intl.DateTimeFormat().resolvedOptions().timeZone
const intention = ref(settings.value.intention)
const dead = ref<Rejection[]>([])
const restoring = ref(false)
const file = ref<HTMLInputElement | null>(null)

const set = (payload: SettingPayload) => app.record({ kind: 'setting', v: 1, payload })
const hourLabel = (h: number) => new Date(Date.UTC(2026, 0, 1, h)).toLocaleTimeString(undefined, { hour: 'numeric', timeZone: 'UTC' })
const notes = computed(() => events.value.filter((e): e is EventOf<'flag'> => e.kind === 'flag' && e.v === 1).sort((a, b) => b.occurredAt - a.occurredAt))
const syncText = computed(() => {
  if (sync.value.ok === null) return t('Syncing…')
  if (!sync.value.ok) return t('Offline. Your progress is saved here and syncs later.')
  return sync.value.pending ? t('{n} to sync', { n: sync.value.pending }) : t('Synced')
})

async function syncNow() {
  await app.flush()
  dead.value = await app.deadLetters()
}

function saveIntention() {
  const text = intention.value.trim().slice(0, 200)
  if (text && text !== settings.value.intention) void set({ key: 'intention', value: text })
}

function download() {
  const url = URL.createObjectURL(exportLog(events.value))
  const a = document.createElement('a')
  a.href = url
  a.download = exportName()
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

async function restoreFrom(e: Event) {
  const picked = (e.target as HTMLInputElement).files?.[0]
  if (!picked) return
  restoring.value = true
  try {
    const { sent, rejected } = await app.restore(await picked.text())
    toast({ text: rejected ? t('Sent {n} events; {r} were refused', { n: sent, r: rejected }) : t('Sent {n} events to the server', { n: sent }) })
  } catch (error) {
    toast({ text: error instanceof Error && !/fetch|network/i.test(error.message) ? error.message : t("Couldn't reach the server. Try again when you're online.") })
  } finally {
    restoring.value = false
    if (file.value) file.value.value = ''
  }
}

onMounted(async () => { dead.value = await app.deadLetters() })
</script>

<template>
  <main class="screen tabbed">
    <header class="top">
      <button class="icon-btn" :aria-label="t('Back')" @click="router.back()"><IconArrowLeft :size="20" /></button>
      <span class="t-title">{{ t('Settings') }}</span>
      <span style="width: 34px" />
    </header>

    <section class="list">
      <div class="t-label">{{ t('Study') }}</div>
      <label class="row">
        <span class="grow">{{ t('Review time per day') }}<span class="t-meta block">{{ t('Reviews past this wait for another day.') }}</span></span>
        <select :value="settings.reviewBudgetMin" @change="set({ key: 'reviewBudgetMin', value: Number(($event.target as HTMLSelectElement).value) })">
          <option v-for="m in BUDGETS" :key="m" :value="m">{{ t('{n} min', { n: m }) }}</option>
        </select>
      </label>
      <label class="row">
        <span class="grow">{{ t('A new day starts at') }}</span>
        <select :value="settings.clock.dayStartHour" @change="set({ key: 'dayStartHour', value: Number(($event.target as HTMLSelectElement).value) })">
          <option v-for="h in HOURS" :key="h" :value="h">{{ hourLabel(h) }}</option>
        </select>
      </label>
      <div class="row">
        <span class="grow">{{ t('Time zone') }}<span class="t-meta block">{{ settings.clock.tz }}</span></span>
        <button v-if="deviceTz !== settings.clock.tz" class="chip" @click="set({ key: 'studyTz', value: deviceTz })">{{ t('Use {x}', { x: deviceTz }) }}</button>
      </div>
      <label class="field plan">{{ t('Your plan') }}
        <input v-model="intention" maxlength="200" :placeholder="t('After I get into bed, I’ll do a 15-minute session')" @change="saveIntention" />
      </label>
    </section>

    <section class="list">
      <div class="t-label">{{ t('Support language') }}</div>
      <div class="seg">
        <button :class="{ on: settings.supportLocale === 'en' }" @click="set({ key: 'supportLocale', value: 'en' })">English</button>
        <button :class="{ on: settings.supportLocale === 'zh-Hans' }" @click="set({ key: 'supportLocale', value: 'zh-Hans' })">中文</button>
      </div>
      <p class="t-meta">{{ t('Untranslated text stays in English.') }}</p>
    </section>

    <section class="list">
      <div class="t-label">{{ t('Sync') }}</div>
      <div class="row"><span class="grow">{{ syncText }}</span><button class="chip" @click="syncNow">{{ t('Sync now') }}</button></div>
      <div v-for="d in dead" :key="d.id" class="row t-meta">{{ t('Not accepted: {x}', { x: d.error }) }}</div>
    </section>

    <section class="list">
      <div class="t-label">{{ t('Backup') }}</div>
      <button class="row tap" @click="download">
        <span class="ic"><IconDownload :size="18" /></span>
        <span class="grow">{{ t('Export your history') }}<span class="t-meta block">{{ t('{n} events, as one file', { n: events.length }) }}</span></span>
      </button>
      <button class="row tap" :disabled="restoring" @click="file?.click()">
        <span class="ic"><IconUpload :size="18" /></span>
        <span class="grow">{{ restoring ? t('Restoring…') : t('Restore from a file') }}<span class="t-meta block">{{ t('Sends a backup to the server. Anything it already has is skipped.') }}</span></span>
      </button>
      <input ref="file" type="file" accept="application/json,.json" hidden @change="restoreFrom" />
    </section>

    <section v-if="notes.length" class="list">
      <div class="t-label">{{ t('Your notes') }}</div>
      <div v-for="n in notes" :key="n.id" class="row">
        <span class="grow">{{ n.payload.note }}<span v-if="n.payload.target" class="t-meta block">{{ n.payload.target.split('@')[0]!.split(':').at(-1) }}</span></span>
      </div>
    </section>

    <section class="list">
      <button class="row tap" @click="router.go({ name: 'credits' })">
        <span class="grow">{{ t('Credits and licenses') }}</span><IconChevronRight :size="18" class="muted" />
      </button>
      <div class="t-meta">{{ t('Build {x}', { x: content.manifest.build }) }}</div>
    </section>
  </main>
</template>

<style scoped>
select {
  font: inherit; font-size: 14px; color: var(--text-primary); background: var(--surface-1); border: 1px solid var(--border-strong);
  border-radius: 10px; padding: 7px 10px;
}
.plan { padding-top: 10px; }
</style>
