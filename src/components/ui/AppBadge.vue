<script setup>
defineProps({
  tone: { type: String, default: 'neutral' }, // neutral | primary | accent | success | warning | danger | info
  size: { type: String, default: 'md' }, // sm | md
})
</script>

<template>
  <span class="badge" :class="[`badge--${tone}`, `badge--${size}`]"><slot /></span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: var(--font-weight-bold);
  border-radius: var(--radius-full);
  white-space: nowrap;
  line-height: 1;
}
.badge--sm {
  font-size: var(--text-xs);
  padding: 4px 8px;
}
.badge--md {
  font-size: var(--text-sm);
  padding: 5px 12px;
}
.badge--neutral {
  background: var(--color-primary-050);
  color: var(--color-text-muted);
}
.badge--primary {
  background: var(--color-primary-100);
  color: var(--color-primary-800);
}
.badge--accent {
  background: var(--color-accent-050);
  color: #8a4b12;
}
.badge--success {
  background: var(--color-success-bg);
  color: var(--color-success);
}
.badge--warning {
  background: var(--color-warning-bg);
  color: var(--color-warning);
}
.badge--danger {
  background: var(--color-danger-bg);
  color: var(--color-danger);
}
.badge--info {
  background: var(--color-info-bg);
  color: var(--color-info);
}
</style>
