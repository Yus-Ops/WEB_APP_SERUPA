<script setup>
import { computed, useId } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  hint: { type: String, default: '' },
  error: { type: String, default: '' },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  rows: { type: Number, default: 4 },
  maxlength: { type: Number, default: null },
  showCount: { type: Boolean, default: false },
})
defineEmits(['update:modelValue'])

const uid = useId()
const count = computed(() => (props.modelValue || '').length)
const describedBy = computed(() =>
  [props.error ? `${uid}-err` : null, props.hint ? `${uid}-hint` : null]
    .filter(Boolean)
    .join(' ') || undefined,
)
</script>

<template>
  <div class="field" :class="{ 'has-error': error }">
    <div v-if="label || showCount" class="field__top">
      <label v-if="label" :for="uid" class="field__label">
        {{ label }}
        <span v-if="required" class="field__req" aria-hidden="true">*</span>
      </label>
      <span v-if="showCount" class="field__count">
        {{ count }}<template v-if="maxlength"> / {{ maxlength }}</template>
      </span>
    </div>
    <textarea
      :id="uid"
      class="field__input"
      :value="modelValue"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :rows="rows"
      :maxlength="maxlength || undefined"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="describedBy"
      @input="$emit('update:modelValue', $event.target.value)"
    />
    <p v-if="error" :id="`${uid}-err`" class="field__error">{{ error }}</p>
    <p v-else-if="hint" :id="`${uid}-hint`" class="field__hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field__top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
}
.field__label {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
}
.field__req {
  color: var(--color-danger);
}
.field__count {
  font-size: var(--text-xs);
  color: var(--color-text-subtle);
  font-variant-numeric: tabular-nums;
}
.field__input {
  width: 100%;
  padding: 11px 14px;
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  resize: vertical;
  min-height: 96px;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}
.field__input::placeholder {
  color: var(--color-text-subtle);
}
.field__input:hover:not(:disabled) {
  border-color: var(--color-primary-300);
}
.field__input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: var(--shadow-focus);
}
.has-error .field__input {
  border-color: var(--color-danger);
}
.field__error {
  font-size: var(--text-sm);
  color: var(--color-danger);
}
.field__hint {
  font-size: var(--text-sm);
  color: var(--color-text-muted);
}
</style>
