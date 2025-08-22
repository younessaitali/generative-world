<script setup lang="ts">
import ExtractorList from '@/components/extractors/ExtractorList.vue';

defineProps<{ title?: string }>();
</script>

<template>
  <UCard :ui="{ body: 'p-0 sm:p-0' }" class="h-full flex flex-col">
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-pickaxe" class="size-5 text-primary" />
          <h2 class="text-base font-semibold">{{ title ?? 'Mining Overview' }}</h2>
        </div>
        <UBadge color="neutral" variant="soft" class="hidden sm:inline-flex">Live</UBadge>
      </div>
    </template>

    <div class="flex-1 overflow-y-auto">
      <ExtractorList class="p-3 sm:p-4" />
    </div>
  </UCard>
</template>
