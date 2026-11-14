<script setup lang="ts">
// Provides the started app and shows the screen for the current route (router.ts), with the tab bar
// under tab screens. A history that hasn't finished first-run setup opens it once the first sync has
// settled, so a device joining an existing history skips it.
import { computed, provide, watch, watchEffect } from 'vue'
import { APP, type App } from './app.ts'
import TabBar from './parts/TabBar.vue'
import Toast from './parts/Toast.vue'
import LessonPlayer from './player/LessonPlayer.vue'
import { tabOf, useRouter } from './router.ts'
import Credits from './screens/Credits.vue'
import GraphMap from './screens/GraphMap.vue'
import Item from './screens/Item.vue'
import Path from './screens/Path.vue'
import Progress from './screens/Progress.vue'
import Session from './screens/Session.vue'
import Settings from './screens/Settings.vue'
import Today from './screens/Today.vue'
import Unit from './screens/Unit.vue'
import Watch from './screens/Watch.vue'
import Week from './screens/Week.vue'
import Welcome from './screens/Welcome.vue'

const props = defineProps<{ app: App }>()
provide(APP, props.app)
const router = useRouter(props.app.content.manifest.lang)
const route = router.route
const tab = computed(() => tabOf(route.value))
const lesson = computed(() => (route.value.name === 'lesson' && props.app.content.manifest.lessons[route.value.id] ? route.value.id : null))

watch(() => route.value, () => window.scrollTo({ top: 0 }))
watchEffect(() => {
  if (props.app.sync.value.ok === null || props.app.settings.value.setupDone) return
  if (route.value.name !== 'welcome' && route.value.name !== 'lesson') router.replace({ name: 'welcome' })
})
</script>

<template>
  <Welcome v-if="route.name === 'welcome'" />
  <LessonPlayer v-else-if="lesson" :key="lesson" :lesson-id="lesson" @close="router.back()" @open="(id) => router.replace({ name: 'lesson', id })" />
  <Session v-else-if="route.name === 'session'" :key="route.minutes" :minutes="route.minutes" @close="router.back()" />
  <template v-else>
    <Path v-if="route.name === 'path'" :view="route.view" />
    <Unit v-else-if="route.name === 'unit'" :key="route.id" :id="route.id" />
    <GraphMap v-else-if="route.name === 'map'" />
    <Progress v-else-if="route.name === 'progress'" />
    <Week v-else-if="route.name === 'week'" />
    <Watch v-else-if="route.name === 'watch'" />
    <Item v-else-if="route.name === 'item'" :key="route.id" :id="route.id" />
    <Settings v-else-if="route.name === 'settings'" />
    <Credits v-else-if="route.name === 'credits'" />
    <Today v-else />
    <TabBar v-if="tab" :tab="tab" />
  </template>
  <Toast />
</template>
