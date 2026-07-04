<script setup>
/**
 * Logo Serupa — mark SVG (dua bentuk bertumpang tindih = kemiripan/overlap)
 * plus wordmark. SVG agar tajam di segala ukuran & konsisten di light/dark.
 */
defineProps({
  variant: { type: String, default: 'full' }, // full | mark
  light: { type: Boolean, default: false }, // wordmark putih untuk latar gelap
  size: { type: Number, default: 32 },
})
</script>

<template>
  <span class="logo" :class="{ 'logo--light': light }">
    <svg
      class="logo__mark"
      :width="size"
      :height="size"
      viewBox="0 0 40 40"
      role="img"
      aria-label="Serupa"
    >
      <rect x="0" y="0" width="40" height="40" rx="11" fill="var(--color-primary-700)" />
      <circle cx="16" cy="20" r="8.5" fill="#fff" fill-opacity="0.92" />
      <circle cx="24" cy="20" r="8.5" fill="var(--color-accent)" fill-opacity="0.9" />
      <path
        d="M20 12.9a8.5 8.5 0 0 1 0 14.2 8.5 8.5 0 0 1 0-14.2z"
        fill="var(--color-primary-800)"
        fill-opacity="0.55"
      />
    </svg>
    <span v-if="variant === 'full'" class="logo__word">Serupa</span>
  </span>
</template>

<style scoped>
.logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}
.logo__mark {
  display: block;
  flex-shrink: 0;
  border-radius: 11px;
}
.logo__word {
  font-weight: var(--font-weight-black);
  font-size: var(--text-xl);
  letter-spacing: -0.02em;
  color: var(--color-primary-800);
}
.logo--light .logo__word {
  color: #fff;
}
</style>
