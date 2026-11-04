<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { currentSession, supabase } from './adapters/auth.ts'
import Login from './screens/Login.vue'
import Foundation from './screens/Foundation.vue'

const signedIn = ref<boolean | null>(null)

onMounted(async () => {
  signedIn.value = (await currentSession()) !== null
  supabase.auth.onAuthStateChange((_event, session) => { signedIn.value = session !== null })
})
</script>

<template>
  <Foundation v-if="signedIn" />
  <Login v-else-if="signedIn === false" />
</template>
