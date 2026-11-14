// Marking things done or known (README Completion & test-out): one tap records a `claim`, and the
// toast offers Undo, which puts back the claim that was there before. Nothing asks to confirm.
import type { ClaimTarget } from '@lang-learner/core'
import { useApp } from './app.ts'
import { t } from './i18n/index.ts'
import { toast } from './parts/toast.ts'

export function useClaims(): { mark(target: ClaimTarget, as: 'done' | 'known' | 'none'): Promise<void> } {
  const app = useApp()
  const record = (target: ClaimTarget, as: 'done' | 'known' | 'none') =>
    app.record({ kind: 'claim', v: 1, payload: { ...target, as } })
  return {
    async mark(target, as) {
      const before = app.progress.value.claim(target) ?? 'none'
      await record(target, as)
      const text = as === 'done' ? t('Marked as done') : as === 'known' ? t('Marked as known') : t('Mark removed')
      toast({ text, action: { label: t('Undo'), run: () => void record(target, before) } })
    },
  }
}
