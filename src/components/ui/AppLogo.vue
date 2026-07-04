<script setup>
/**
 * Logo Serupa — memakai berkas gambar asli (`public/logo-mark.png`, hasil potong
 * ikon dari `logo.png`) sebagai marka, ditambah wordmark teks agar tajam & bisa
 * menyesuaikan warna di latar terang/gelap (`light`).
 *
 *   variant='full' → ikon + tulisan "Serupa"
 *   variant='mark' → ikon saja
 *   light          → wordmark putih untuk latar gelap
 */
defineProps({
  variant: { type: String, default: 'full' }, // full | mark
  light: { type: Boolean, default: false },
  size: { type: Number, default: 32 },
})
</script>

<template>
  <span class="logo" :class="{ 'logo--light': light }">
    <img
      class="logo__mark"
      src="/logo-mark.png"
      :width="size"
      :height="size"
      :alt="variant === 'full' ? '' : 'Serupa'"
      decoding="async"
    />
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
  object-fit: contain;
  background: #fff;
  border-radius: 9px;
  box-shadow: 0 1px 2px rgba(16, 44, 38, 0.1);
}
.logo--light .logo__mark {
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.18);
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
