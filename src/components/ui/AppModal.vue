<script setup>
import { watch, onBeforeUnmount, useId } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  size: { type: String, default: 'md' }, // sm | md | lg
})
const emit = defineEmits(['update:modelValue'])
const uid = useId()

function close() {
  emit('update:modelValue', false)
}
function onKey(e) {
  if (e.key === 'Escape') close()
}

watch(
  () => props.modelValue,
  (open) => {
    if (typeof document === 'undefined') return
    document.body.style.overflow = open ? 'hidden' : ''
    if (open) document.addEventListener('keydown', onKey)
    else document.removeEventListener('keydown', onKey)
  },
)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="modal"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="title ? `${uid}-title` : undefined"
        @click.self="close"
      >
        <div class="modal__panel" :class="`modal__panel--${size}`">
          <header v-if="title || $slots.header" class="modal__header">
            <slot name="header">
              <h2 :id="`${uid}-title`" class="modal__title">{{ title }}</h2>
            </slot>
            <button class="modal__close" type="button" aria-label="Tutup" @click="close">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </header>
          <div class="modal__body"><slot /></div>
          <footer v-if="$slots.footer" class="modal__footer">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: rgba(36, 48, 46, 0.45);
  backdrop-filter: blur(2px);
}
.modal__panel {
  width: 100%;
  max-height: calc(100vh - var(--space-8));
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}
.modal__panel--sm {
  max-width: 420px;
}
.modal__panel--md {
  max-width: 560px;
}
.modal__panel--lg {
  max-width: 760px;
}
.modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-5) var(--space-6);
  border-bottom: 1px solid var(--color-border);
}
.modal__title {
  font-size: var(--text-xl);
}
.modal__close {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  flex-shrink: 0;
  transition: background var(--transition-fast);
}
.modal__close:hover {
  background: var(--color-primary-050);
  color: var(--color-text);
}
.modal__body {
  padding: var(--space-6);
  overflow-y: auto;
}
.modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-5) var(--space-6);
  border-top: 1px solid var(--color-border);
  background: var(--color-background);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity var(--transition-base);
}
.modal-enter-active .modal__panel,
.modal-leave-active .modal__panel {
  transition:
    transform var(--transition-base),
    opacity var(--transition-base);
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .modal__panel,
.modal-leave-to .modal__panel {
  transform: translateY(12px) scale(0.98);
  opacity: 0;
}
</style>
