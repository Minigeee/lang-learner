<script setup lang="ts">
import { ref } from 'vue'
import { sendCode, verifyCode } from '../adapters/auth.ts'
import { t } from '../i18n/index.ts'

const email = ref('')
const code = ref('')
const sent = ref(false)
const busy = ref(false)
const error = ref('')

async function attempt(action: () => Promise<void>) {
  busy.value = true
  error.value = ''
  try {
    await action()
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    busy.value = false
  }
}

const send = () => attempt(async () => {
  await sendCode(email.value.trim())
  sent.value = true
})
const verify = () => attempt(() => verifyCode(email.value.trim(), code.value.trim()))
</script>

<template>
  <main class="screen">
    <h1 class="t-title">{{ t('Sign in') }}</h1>
    <form v-if="!sent" @submit.prevent="send">
      <label class="field">
        {{ t('Email') }}
        <input v-model="email" type="email" autocomplete="email" required />
      </label>
      <br />
      <button class="btn pri" :disabled="busy">{{ t('Send code') }}</button>
    </form>
    <form v-else @submit.prevent="verify">
      <p class="t-meta">{{ t('Enter the code we sent to {email}.', { email }) }}</p>
      <label class="field">
        {{ t('Code') }}
        <input v-model="code" inputmode="numeric" autocomplete="one-time-code" required />
      </label>
      <br />
      <button class="btn pri" :disabled="busy">{{ t('Sign in') }}</button>
      <br />
      <button class="btn sec" type="button" @click="sent = false">{{ t('Use a different email') }}</button>
    </form>
    <p v-if="error" class="error">{{ error }}</p>
  </main>
</template>
