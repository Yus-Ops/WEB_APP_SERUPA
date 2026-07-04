<script setup>
import { useId } from 'vue'

defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  options: { type: Array, default: () => [] }, // [{ value, label }]
  hint: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})
defineEmits(['update:modelValue'])
const uid = useId()
</script>

<template>
  <div class="field">
    <label v-if="label" :for="uid" class="field__label">{{ label }}</label>
    <div class="field__wrap">
      <select
        :id="uid"
        class="field__select"
        :value="modelValue"
        :disabled="disabled"
        @change="$emit('update:modelValue', $event.target.value)"
      >
        <option v-for="opt in options" :key="opt.value" :value="opt.value">
          {{ opt.label }}
        </option>
      </select>
      <svg class="field__chevron" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M6 8l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </div>
    <p v-if="hint" class="field__hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field__label {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
}
.field__wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.field__select {
  width: 100%;
  padding: 11px 40px 11px 14px;
  font-size: var(--text-base);
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  appearance: none;
  cursor: pointer;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}
.field__select:hover:not(:disabled) {
  border-color: var(--color-primary-300);
}
.field__select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: var(--shadow-focus);
}
.field__chevron {
  position: absolute;
  right: 12px;
  width: 20px;
  height: 20px;
  color: var(--color-text-muted);
  pointer-events: none;
}
.field__hint {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
</style>
