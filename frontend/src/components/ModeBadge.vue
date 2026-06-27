<script setup>
import { computed } from "vue"
import { apiMode } from "@/lib/api"

const isDemo = computed(() => apiMode.demo)
const title = computed(() =>
  isDemo.value
    ? "Mode demo: skor disimulasikan di sisi klien dengan korpus contoh. Atur VITE_PYTHON_API untuk memakai model embedding asli."
    : `Terhubung ke layanan AI: ${apiMode.pythonApi}`,
)
</script>

<template>
  <span class="mode-badge" :class="{ demo: isDemo }" :title="title">
    <span class="dot" />
    {{ isDemo ? "Mode Demo" : "Live" }}
  </span>
</template>

<style scoped>
.mode-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  font-weight: 600;
  padding: 5px 11px;
  border-radius: 999px;
  border: 1px solid var(--border-2);
  background: var(--surface);
  color: var(--muted);
  cursor: help;
  user-select: none;
}
.mode-badge .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 3px rgba(47, 110, 136, 0.16);
}
.mode-badge.demo {
  color: #8a5a16;
  border-color: rgba(176, 125, 46, 0.4);
  background: rgba(176, 125, 46, 0.1);
}
.mode-badge.demo .dot {
  background: #b07d2e;
  box-shadow: 0 0 0 3px rgba(176, 125, 46, 0.2);
  animation: blink 2.4s ease-in-out infinite;
}
@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}
</style>
