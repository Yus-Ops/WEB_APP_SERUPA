<script setup>
import MatchCard from "./MatchCard.vue"

defineProps({
  matches: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  title: { type: String, default: "Judul termirip di korpus" },
  queryTokens: { type: Array, default: () => [] },
})
</script>

<template>
  <section class="list">
    <div class="list-head">
      <h3 class="serif">{{ title }}</h3>
      <span v-if="matches.length" class="faint">{{ matches.length }} hasil</span>
    </div>

    <div v-if="loading && !matches.length" class="empty">
      <span class="spinner" /> Memeriksa…
    </div>

    <p v-else-if="!matches.length" class="empty faint">
      Belum ada hasil. Ketik atau tempel calon judul untuk melihat judul termirip.
    </p>

    <TransitionGroup v-else name="rise" tag="div" class="rows">
      <MatchCard
        v-for="(m, i) in matches"
        :key="m.id ?? i"
        :match="m"
        :rank="i + 1"
        :query-tokens="queryTokens"
      />
    </TransitionGroup>
  </section>
</template>

<style scoped>
.list-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 14px;
}
.list-head h3 {
  font-size: 18px;
}
.rows {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.empty {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 28px 16px;
  font-size: 14px;
}
.rise-enter-active {
  transition: opacity 0.35s ease, transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.rise-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.rise-move {
  transition: transform 0.35s ease;
}
</style>
