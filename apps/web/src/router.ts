// The app's routes and the URL hash they live in. Screens name a route; only this module knows how a
// route is spelled in the hash, so a route can be renamed without touching its callers.
import { readonly, ref, type Ref } from 'vue'
import { SESSION_LENGTHS, type ItemId, type LessonId } from '@lang-learner/core'

export type Route =
  | { name: 'today' }
  | { name: 'path'; view?: 'items' }
  | { name: 'unit'; id: string }
  | { name: 'map' }
  | { name: 'progress' }
  | { name: 'week' }
  | { name: 'watch' }
  | { name: 'item'; id: ItemId }
  | { name: 'settings' }
  | { name: 'credits' }
  | { name: 'welcome' }
  | { name: 'lesson'; id: LessonId }
  | { name: 'session'; minutes: number }

/** The four bottom tabs, in order. */
export const TABS = ['today', 'path', 'progress', 'watch'] as const
export type Tab = (typeof TABS)[number]

/** The tab a route belongs under, or null for full-screen routes (lessons, sessions, first run). */
export function tabOf(route: Route): Tab | null {
  switch (route.name) {
    case 'today': case 'settings': case 'credits': return 'today'
    case 'path': case 'unit': case 'map': case 'item': return 'path'
    case 'progress': case 'week': return 'progress'
    case 'watch': return 'watch'
    default: return null
  }
}

/** Parses a hash; anything unknown is Today. `lang` turns a lesson slug back into its id. */
export function parseRoute(hash: string, lang: string): Route {
  const [head = '', ...rest] = hash.replace(/^#\/?/, '').split('/')
  const arg = rest.length ? decodeURIComponent(rest.join('/')) : ''
  switch (head) {
    case 'path': return arg === 'items' ? { name: 'path', view: 'items' } : { name: 'path' }
    case 'unit': return arg ? { name: 'unit', id: arg } : { name: 'path' }
    case 'map': case 'progress': case 'week': case 'watch': case 'settings': case 'credits': case 'welcome': return { name: head }
    case 'item': return arg.split(':').length >= 3 ? { name: 'item', id: arg as ItemId } : { name: 'today' }
    case 'lesson': return /^[a-z0-9-]+$/.test(arg) ? { name: 'lesson', id: `${lang}:les:${arg}` as LessonId } : { name: 'today' }
    case 'session': {
      const minutes = Number(arg)
      return (SESSION_LENGTHS as readonly number[]).includes(minutes) ? { name: 'session', minutes } : { name: 'today' }
    }
    default: return { name: 'today' }
  }
}

export function hrefOf(route: Route): string {
  switch (route.name) {
    case 'today': return '#/'
    case 'path': return route.view ? `#/path/${route.view}` : '#/path'
    case 'unit': return `#/unit/${encodeURIComponent(route.id)}`
    case 'item': return `#/item/${encodeURIComponent(route.id)}`
    case 'lesson': return `#/lesson/${route.id.split(':').at(-1)}`
    case 'session': return `#/session/${route.minutes}`
    default: return `#/${route.name}`
  }
}

export interface Router {
  route: Readonly<Ref<Route>>
  go(route: Route): void
  /** Shows a route in place of the current one, so Back skips it. */
  replace(route: Route): void
  /** Returns to the previous in-app screen, or to `fallback` when this one was opened first. */
  back(fallback?: Route): void
}

let router: Router | null = null

/** The one router, created on first use, following the hash. */
export function useRouter(lang: string): Router {
  if (router) return router
  const route = ref<Route>(parseRoute(location.hash, lang))
  let depth = 0
  window.addEventListener('hashchange', () => { route.value = parseRoute(location.hash, lang) })
  router = {
    route: readonly(route) as Readonly<Ref<Route>>,
    go(next) {
      const href = hrefOf(next)
      if (href === location.hash || (href === '#/' && location.hash === '')) return
      depth++
      location.hash = href
    },
    replace(next) {
      location.replace(hrefOf(next))
    },
    back(fallback = { name: 'today' }) {
      if (depth > 0) {
        depth--
        history.back()
      } else location.replace(hrefOf(fallback))
    },
  }
  return router
}
