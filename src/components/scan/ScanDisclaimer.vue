<script setup>
/**
 * Disclaimer WAJIB (PRD §11.1): skor = indikator kemiripan tekstual-semantik,
 * BUKAN vonis duplikasi. Keputusan akhir ada pada mahasiswa & pembimbing (D1).
 */
defineProps({
  compact: { type: Boolean, default: false },
})
</script>

<template>
  <aside class="disclaimer" :class="{ 'disclaimer--compact': compact }">
    <span class="disclaimer__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 11v5M12 7.5h.01" />
      </svg>
    </span>
    <p class="disclaimer__text">
      Skor menunjukkan <strong>seberapa mirip makna topik</strong>, bukan tuduhan menjiplak. Dua
      penelitian bisa terlihat mirip tapi tetap berbeda (populasi, lokasi, atau cara penelitian).
      Keputusan akhir ada pada <strong>Anda dan pembimbing</strong>.
    </p>
  </aside>
</template>

<style scoped>
.disclaimer {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  background: var(--color-info-bg);
  border: 1px solid #cfe0ec;
  border-radius: var(--radius-md);
}
.disclaimer--compact {
  padding: var(--space-3) var(--space-4);
}
.disclaimer__icon {
  flex-shrink: 0;
  color: var(--color-info);
  margin-top: 1px;
}
.disclaimer__icon svg {
  width: 20px;
  height: 20px;
}
.disclaimer__text {
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
  color: #275270;
}
.disclaimer__text strong {
  color: var(--color-info);
  font-weight: var(--font-weight-bold);
}
</style>
