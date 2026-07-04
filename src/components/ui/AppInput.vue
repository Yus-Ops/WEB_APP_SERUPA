<script setup>
import { computed, useId } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  hint: { type: String, default: '' },
  error: { type: String, default: '' },
  required: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  inputmode: { type: String, default: null },
  autocomplete: { type: String, default: null },
})
defineEmits(['update:modelValue'])

const uid = useId()
const describedBy = computed(() =>
  [props.error ? `${uid}-err` : null, props.hint ? `${uid}-hint` : null]
    .filter(Boolean)
    .join(' ') || undefined,
)
</script>

<template>
  <div class="field" :class="{ 'has-error': error }">
    <label v-if="label" :for="uid" class="field__label">
      {{ label }}
      <span v-if="required" class="field__req" aria-hidden="true">*</span>
    </label>
    <input
      :id="uid"
      class="field__input"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :inputmode="inputmode || undefined"
      :autocomplete="autocomplete || undefined"
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
.field__label {
  font-size: var(--text-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text);
}
.field__req {
  color: var(--color-danger);
}
.field__input {
  width: 100%;
  padding: 11px 14px;
  font-size: var(--text-base);
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
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
.field__input:disabled {
  background: var(--color-primary-050);
  cursor: not-allowed;
}
.has-error .field__input {
  border-color: var(--color-danger);
}
.has-error .field__input:focus {
  box-shadow: 0 0 0 3px rgba(192, 69, 58, 0.2);
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
