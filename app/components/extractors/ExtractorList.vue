<script setup lang="ts">
import { useExtractorLoader } from '@/composables/world/useExtractorLoader';
import type { ExtractorPlacement } from '@/composables/world/useExtractorPlacement';

const props = defineProps<{ title?: string }>();

const { isLoading, loadError, lastLoaded, loadExtractors } = useExtractorLoader();
const extractors = ref<ExtractorPlacement[]>([]);

const refresh = async () => {
  const list = await loadExtractors();
  extractors.value = list;
};

refresh();

const statusColor = (status: string) => {
  const s = status.toLowerCase();
  if (s === 'active') return 'success';
  if (s === 'error') return 'error';
  return 'neutral';
};
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-pickaxe" class="size-5 text-primary" />
        <h3 class="text-sm font-medium">
          {{ props.title ?? 'Your Extractors' }}
          <span v-if="lastLoaded" class="text-xs text-muted">
            (updated {{ new Date(lastLoaded).toLocaleTimeString() }})
          </span>
        </h3>
      </div>
      <UButton size="xs" color="neutral" variant="outline" :loading="isLoading" @click="refresh">
        Refresh
      </UButton>
    </div>

    <UAlert
      v-if="loadError"
      color="error"
      :title="'Failed to load extractors'"
      :description="loadError.message"
    />

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
      <UCard v-for="ex in extractors" :key="ex.id" :ui="{ body: 'p-4' }">
        <div class="flex items-center justify-between">
          <UBadge :color="statusColor(ex.status)" variant="soft">{{ ex.status }}</UBadge>
          <span class="text-xs font-semibold tracking-wide">{{ ex.resourceType }}</span>
        </div>
        <div class="mt-2 text-xs text-muted">@ ({{ ex.x }}, {{ ex.y }})</div>
        <div class="mt-3">
          <div class="flex items-center justify-between text-xs mb-1">
            <span>Efficiency</span>
            <span>{{ Math.round(ex.efficiency * 100) }}%</span>
          </div>
          <UProgress :model-value="Math.round(ex.efficiency * 100)" />
        </div>
        <div class="mt-2 flex items-center justify-between text-xs text-muted">
          <span>Since</span>
          <span>{{ ex.createdAt.toLocaleDateString() }}</span>
        </div>
      </UCard>

      <UCard v-if="!isLoading && extractors.length === 0" :ui="{ body: 'p-6' }">
        <div class="text-center text-sm text-muted">
          No extractors yet. Place one on a discovered vein to start mining.
        </div>
      </UCard>
    </div>
  </div>
</template>
