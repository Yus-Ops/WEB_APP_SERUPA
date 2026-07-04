<script setup>
defineProps({
  size: { type: [Number, String], default: 20 },
  label: { type: String, default: 'Memuat…' },
})
</script>

<template>
  <span
    class="spinner"
    role="status"
    :aria-label="label"
    :style="{ width: `${size}px`, height: `${size}px` }"
  />
</template>

<style scoped>
.spinner {
  display: inline-block;
  border: 2.5px solid var(--color-primary-200);
  border-right-color: var(--color-primary-700);
  border-radius: 50%;
  animation: spin 0.65s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
