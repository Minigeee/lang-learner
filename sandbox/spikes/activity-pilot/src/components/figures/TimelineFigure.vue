<script setup lang="ts">
import { t } from '../../i18n'
</script>

<template>
  <svg viewBox="0 0 308 92" width="100%" role="img" :aria-label="t('Timeline: 没 covers the past, 不 covers habits and the future')">
    <line x1="14" y1="48" x2="294" y2="48" stroke="var(--border-stronger)" stroke-width="1.5" stroke-linecap="round" />
    <circle cx="154" cy="48" r="4" fill="var(--text-secondary)" />
    <text x="154" y="80" text-anchor="middle" font-size="12" fill="var(--text-secondary)" font-family="Lexend">{{ t('now') }}</text>
    <rect x="30" y="8" width="96" height="28" rx="8" fill="var(--surface-3)" />
    <text x="78" y="27" text-anchor="middle" font-size="16" fill="var(--text-primary)" font-family="Noto Serif SC">没 · {{ t('past') }}</text>
    <rect x="178" y="8" width="118" height="28" rx="8" fill="var(--surface-3)" />
    <text x="237" y="27" text-anchor="middle" font-size="16" fill="var(--text-primary)" font-family="Noto Serif SC">不 · {{ t('habit, future') }}</text>
  </svg>
</template>
