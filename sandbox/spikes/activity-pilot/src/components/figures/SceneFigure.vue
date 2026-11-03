<script setup lang="ts">
import { t } from '../../i18n'
// Picture support for the cat story. `highlight` emphasizes the object the current line is about.
defineProps<{ highlight?: 'chair' | 'table' | 'book' | 'cat' | null; showCatOn?: 'book' | 'hidden' }>()
</script>

<template>
  <svg viewBox="0 0 300 168" width="100%" role="img" :aria-label="t('A chair, a table with a book on it, and a cat on the book')">
    <rect x="0" y="0" width="300" height="168" rx="16" fill="var(--player)" />
    <line x1="16" y1="146" x2="284" y2="146" stroke="#3a3631" stroke-width="2" />
    <!-- chair -->
    <g :opacity="highlight && highlight !== 'chair' ? 0.45 : 1" stroke="#c9b8a0" stroke-width="3" fill="none" stroke-linecap="round">
      <path d="M44 146 L44 96 M44 110 L80 110 M80 110 L80 146 M44 96 L44 70" />
    </g>
    <!-- table -->
    <g :opacity="highlight && highlight !== 'table' && highlight !== 'book' ? 0.45 : 1" stroke="#c9b8a0" stroke-width="3" fill="none" stroke-linecap="round">
      <path d="M126 100 L262 100 M140 100 L140 146 M248 100 L248 146" />
    </g>
    <!-- book -->
    <rect x="176" y="88" width="46" height="12" rx="2" :fill="highlight === 'book' ? '#E2583F' : '#8E3B2B'" />
    <!-- cat -->
    <g v-if="showCatOn !== 'hidden'" :opacity="highlight && highlight !== 'cat' && highlight !== 'book' ? 0.6 : 1" fill="#f0ece4">
      <ellipse cx="199" cy="76" rx="20" ry="12" />
      <circle cx="214" cy="62" r="10" />
      <path d="M206 56 L208 45 L213 53 Z M216 53 L222 45 L222 57 Z" />
      <path d="M180 74 Q168 66 172 56" stroke="#f0ece4" stroke-width="4" fill="none" stroke-linecap="round" />
    </g>
  </svg>
</template>
