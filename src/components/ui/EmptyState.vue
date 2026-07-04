<script setup>
defineProps({
  icon: { type: String, default: 'search' }, // search | history | inbox | chart
  title: { type: String, default: '' },
  message: { type: String, default: '' },
})
</script>

<template>
  <div class="empty">
    <div class="empty__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <template v-if="icon === 'search'">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </template>
        <template v-else-if="icon === 'history'">
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
          <path d="M3 3v5h5" />
          <path d="M12 7v5l3 2" />
        </template>
        <template v-else-if="icon === 'chart'">
          <path d="M3 3v18h18" />
          <path d="M7 15l3-4 3 3 4-6" />
        </template>
        <template v-else>
          <path d="M3 8l9-5 9 5v8l-9 5-9-5z" />
          <path d="M3 8l9 5 9-5" />
          <path d="M12 13v8" />
        </template>
      </svg>
    </div>
    <h3 v-if="title" class="empty__title">{{ title }}</h3>
    <p v-if="message" class="empty__message">{{ message }}</p>
    <div class="empty__action">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--space-3);
  padding: var(--space-12) var(--space-6);
}
.empty__icon {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: var(--radius-lg);
  background: var(--color-primary-050);
  color: var(--color-primary-600);
  margin-bottom: var(--space-1);
}
.empty__icon svg {
  width: 30px;
  height: 30px;
}
.empty__title {
  font-size: var(--text-xl);
}
.empty__message {
  max-width: 42ch;
  color: var(--color-text-muted);
}
.empty__action {
  margin-top: var(--space-2);
}
.empty__action:empty {
  display: none;
}
</style>
