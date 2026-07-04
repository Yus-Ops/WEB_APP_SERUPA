<script setup>
import { storeToRefs } from 'pinia'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()
const { items } = storeToRefs(toast)

const icons = {
  success: 'M20 6L9 17l-5-5',
  danger: 'M12 8v5M12 16h.01M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  info: 'M12 16v-5M12 8h.01M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20z',
}
</script>

<template>
  <Teleport to="body">
    <div class="toasts" role="region" aria-live="polite" aria-label="Notifikasi">
      <TransitionGroup name="toast">
        <div v-for="t in items" :key="t.id" class="toast" :class="`toast--${t.type}`">
          <span class="toast__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path :d="icons[t.type] || icons.info" />
            </svg>
          </span>
          <div class="toast__body">
            <p v-if="t.title" class="toast__title">{{ t.title }}</p>
            <p v-if="t.message" class="toast__message">{{ t.message }}</p>
          </div>
          <button class="toast__close" type="button" aria-label="Tutup" @click="toast.dismiss(t.id)">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toasts {
  position: fixed;
  bottom: var(--space-5);
  right: var(--space-5);
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: min(380px, calc(100vw - var(--space-8)));
  pointer-events: none;
}
.toast {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-left-width: 4px;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  pointer-events: auto;
}
.toast--success {
  border-left-color: var(--color-success);
}
.toast--success .toast__icon {
  color: var(--color-success);
}
.toast--danger {
  border-left-color: var(--color-danger);
}
.toast--danger .toast__icon {
  color: var(--color-danger);
}
.toast--info {
  border-left-color: var(--color-info);
}
.toast--info .toast__icon {
  color: var(--color-info);
}
.toast__icon {
  flex-shrink: 0;
  margin-top: 1px;
}
.toast__icon svg {
  width: 20px;
  height: 20px;
}
.toast__body {
  flex: 1;
  min-width: 0;
}
.toast__title {
  font-weight: var(--font-weight-bold);
  font-size: var(--text-sm);
  color: var(--color-text);
}
.toast__message {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  line-height: 1.45;
}
.toast__close {
  flex-shrink: 0;
  color: var(--color-text-subtle);
  padding: 2px;
  border-radius: var(--radius-sm);
}
.toast__close:hover {
  color: var(--color-text);
}

.toast-enter-active,
.toast-leave-active {
  transition:
    transform var(--transition-base),
    opacity var(--transition-base);
}
.toast-enter-from {
  transform: translateX(20px);
  opacity: 0;
}
.toast-leave-to {
  transform: translateX(20px);
  opacity: 0;
}
.toast-leave-active {
  position: absolute;
  right: 0;
  width: 100%;
}
</style>
