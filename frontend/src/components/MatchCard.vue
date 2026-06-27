<script setup>
import { computed, ref } from "vue"
import { bandByCode } from "@/lib/bands"
import { clusterColor } from "@/lib/demo"

const props = defineProps({
  match: { type: Object, required: true },
  rank: { type: Number, default: 0 },
  queryTokens: { type: Array, default: () => [] }, // token judul query (untuk sorot kata sama)
})

const band = computed(() => bandByCode(props.match.category))
const pct = computed(() => props.match.percent ?? Math.round((props.match.similarity ?? 0) * 1000) / 10)
const cColor = computed(() => clusterColor(props.match.cluster))

// ── Sorot kata yang sama antara judul query & judul hasil (Aturan: opsional) ─
const tokenSet = computed(() => new Set(props.queryTokens))
function norm(w) {
  return w.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]/g, "")
}
const titleParts = computed(() =>
  props.match.title.split(/(\s+)/).map((seg) => ({
    t: seg,
    hit: /\S/.test(seg) && tokenSet.value.size > 0 && tokenSet.value.has(norm(seg)),
  })),
)

// ── Abstrak: cuplikan + lihat selengkapnya ──────────────────────────────────
const expanded = ref(false)
const hasAbstract = computed(() => !!(props.match.abstract && props.match.abstract.trim()))
const longAbstract = computed(() => hasAbstract.value && props.match.abstract.length > 110)
</script>

<template>
  <article class="match" :style="{ '--band': band.color, '--band-glow': band.glow }">
    <div class="rank mono">{{ String(rank).padStart(2, "0") }}</div>

    <div class="body">
      <h4 class="title">
        <template v-for="(p, i) in titleParts" :key="i"
          ><mark v-if="p.hit" class="hl">{{ p.t }}</mark
          ><template v-else>{{ p.t }}</template></template
        >
      </h4>

      <div class="meta">
        <span class="band-badge" :style="{ color: band.color }">
          <span class="bdot" :style="{ background: band.color }" />{{ band.label }}
        </span>
        <span v-if="match.year" class="faint">· {{ match.year }}</span>
        <span v-if="match.cluster_label" class="topic" :title="`Tema: ${match.cluster_label}`">
          <span class="tdot" :style="{ background: cColor }" />{{ match.cluster_label }}
        </span>
      </div>

      <p v-if="hasAbstract" class="abstract" :class="{ clamp: !expanded }">{{ match.abstract }}</p>
      <button v-if="longAbstract" class="more" @click="expanded = !expanded">
        {{ expanded ? "Lebih ringkas" : "Lihat selengkapnya" }}
      </button>
    </div>

    <div class="score">
      <div class="pct mono" :style="{ color: band.color }">{{ pct.toFixed(1) }}<small>%</small></div>
      <div class="bar"><span :style="{ width: Math.min(100, pct) + '%' }" /></div>
    </div>
  </article>
</template>

<style scoped>
.match {
  display: grid;
  grid-template-columns: 30px 1fr 120px;
  gap: 16px;
  align-items: start;
  padding: 16px;
  border: 1px solid var(--border);
  border-left: 3px solid var(--band);
  border-radius: 14px;
  background: var(--surface);
  transition: border-color 0.15s ease, transform 0.12s ease, box-shadow 0.15s ease;
}
.match:hover {
  transform: translateY(-1px);
  box-shadow: 0 16px 32px -24px var(--band-glow);
  border-color: var(--border-2);
  border-left-color: var(--band);
}
.rank {
  font-size: 13px;
  color: var(--faint);
  text-align: center;
  padding-top: 2px;
}
.body {
  min-width: 0;
}
.title {
  font-family: var(--sans);
  font-weight: 600;
  font-size: 15px;
  line-height: 1.35;
  color: var(--text);
}
.hl {
  background: rgba(184, 212, 227, 0.55);
  color: #1c3540;
  border-radius: 3px;
  padding: 0 1px;
}
.meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
  font-size: 12.5px;
}
.band-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-weight: 600;
}
.bdot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
.topic {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 100%;
  color: var(--muted);
  font-size: 11.5px;
}
.tdot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex: none;
}
.abstract {
  margin-top: 10px;
  font-size: 13px;
  line-height: 1.55;
  color: var(--muted);
}
.abstract.clamp {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.more {
  margin-top: 6px;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  background: none;
  border: 0;
  padding: 0;
  cursor: pointer;
}
.more:hover {
  text-decoration: underline;
}
.score {
  text-align: right;
}
.pct {
  font-family: var(--serif);
  font-weight: 600;
  font-size: 26px;
  line-height: 1;
}
.pct small {
  font-size: 13px;
  opacity: 0.7;
  margin-left: 1px;
}
.bar {
  margin-top: 10px;
  height: 5px;
  border-radius: 999px;
  background: var(--bg-2);
  overflow: hidden;
}
.bar span {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--band) 45%, transparent), var(--band));
  transition: width 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
@media (max-width: 560px) {
  .match {
    grid-template-columns: 1fr auto;
  }
  .rank {
    display: none;
  }
  .score {
    grid-column: 2;
  }
}
</style>
