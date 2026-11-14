<script setup lang="ts">
// A note about what's on screen, saved as a `flag` event, so a reaction is captured in the moment.
import { onMounted, ref } from 'vue'
import { IconX } from '@tabler/icons-vue'
import { useApp } from '../../app.ts'
import { t } from '../../i18n/index.ts'

const props = defineProps<{ target: string }>()
const emit = defineEmits<{ close: [saved: boolean] }>()
const app = useApp()
const note = ref('')
const box = ref<HTMLTextAreaElement | null>(null)
onMounted(() => box.value?.focus())

async function save() {
  const text = note.value.trim()
  if (!text) return
  await app.record({ kind: 'flag', v: 1, payload: { note: text, target: props.target } })
  emit('close', true)
}
</script>

<template>
  <Transition name="fade" appear><div class="scrim" @click="emit('close', false)" /></Transition>
  <Transition name="rise" appear>
    <form class="sheet" role="dialog" @submit.prevent="save">
      <div class="top">
        <span class="t-head">{{ t('Note on this step') }}</span>
        <button type="button" :aria-label="t('Close')" @click="emit('close', false)"><IconX :size="20" /></button>
      </div>
      <label class="field">
        {{ t('What do you notice?') }}
        <textarea ref="box" v-model="note" maxlength="2000" />
      </label>
      <button class="btn pri" :disabled="!note.trim()">{{ t('Save note') }}</button>
    </form>
  </Transition>
</template>

<style scoped>
.top { display: flex; justify-content: space-between; align-items: center; }
</style>
