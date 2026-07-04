<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps({
  variant: { type: String, default: 'primary' }, // primary | secondary | accent | ghost | danger | subtle
  size: { type: String, default: 'md' }, // sm | md | lg
  block: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  type: { type: String, default: 'button' },
  to: { type: [String, Object], default: null },
  href: { type: String, default: null },
})

const tag = computed(() => (props.to ? RouterLink : props.href ? 'a' : 'button'))
const isDisabled = computed(() => props.disabled || props.loading)
</script>

<template>
  <component
    :is="tag"
    class="btn"
    :class="[`btn--${variant}`, `btn--${size}`, { 'btn--block': block, 'is-loading': loading }]"
    :to="to || undefined"
    :href="href || undefined"
    :type="tag === 'button' ? type : undefined"
    :disabled="tag === 'button' ? isDisabled : undefined"
    :aria-busy="loading || undefined"
  >
    <span v-if="loading" class="btn__spinner" aria-hidden="true" />
    <span class="btn__content"><slot /></span>
  </component>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font-family: var(--font-family-base);
  font-weight: var(--font-weight-bold);
  line-height: 1;
  white-space: nowrap;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast),
    box-shadow var(--transition-fast),
    transform var(--transition-fast);
  text-decoration: none;
  user-select: none;
}
.btn:active {
  transform: translateY(1px);
}
.btn:disabled,
.btn[aria-busy='true'] {
  cursor: not-allowed;
  opacity: 0.6;
  transform: none;
}

/* Ukuran */
.btn--sm {
  font-size: var(--text-sm);
  padding: 8px 14px;
}
.btn--md {
  font-size: var(--text-base);
  padding: 11px 20px;
}
.btn--lg {
  font-size: var(--text-lg);
  padding: 15px 28px;
}
.btn--block {
  width: 100%;
}

/* Varian */
.btn--primary {
  background: var(--color-primary-700);
  color: #fff;
}
.btn--primary:hover {
  background: var(--color-primary-800);
  color: #fff;
}

.btn--accent {
  background: var(--color-accent);
  color: #4a2f12;
}
.btn--accent:hover {
  background: var(--color-accent-600);
  color: #3a2409;
}

.btn--secondary {
  background: var(--color-surface);
  color: var(--color-primary-700);
  border-color: var(--color-primary-200);
  box-shadow: var(--shadow-xs);
}
.btn--secondary:hover {
  background: var(--color-primary-050);
  border-color: var(--color-primary-300);
  color: var(--color-primary-800);
}

.btn--ghost {
  background: transparent;
  color: var(--color-primary-700);
}
.btn--ghost:hover {
  background: var(--color-primary-050);
  color: var(--color-primary-800);
}

.btn--subtle {
  background: var(--color-primary-100);
  color: var(--color-primary-800);
}
.btn--subtle:hover {
  background: var(--color-primary-200);
}

.btn--danger {
  background: var(--color-danger);
  color: #fff;
}
.btn--danger:hover {
  filter: brightness(0.94);
  color: #fff;
}

.btn__spinner {
  width: 1em;
  height: 1em;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: btn-spin 0.6s linear infinite;
}
@keyframes btn-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
