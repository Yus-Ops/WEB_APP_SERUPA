<script setup>
defineProps({
  as: { type: String, default: 'div' },
  padding: { type: String, default: 'md' }, // none | sm | md | lg
  hover: { type: Boolean, default: false },
})
</script>

<template>
  <component :is="as" class="card" :class="[`card--pad-${padding}`, { 'card--hover': hover }]">
    <slot />
  </component>
</template>

<style scoped>
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}
.card--hover {
  transition:
    box-shadow var(--transition-base),
    border-color var(--transition-base),
    transform var(--transition-base);
}
.card--hover:hover {
  box-shadow: var(--shadow-md);
  border-color: var(--color-primary-200);
  transform: translateY(-2px);
}
.card--pad-none {
  padding: 0;
}
.card--pad-sm {
  padding: var(--space-4);
}
.card--pad-md {
  padding: var(--space-6);
}
.card--pad-lg {
  padding: var(--space-8);
}
</style>
