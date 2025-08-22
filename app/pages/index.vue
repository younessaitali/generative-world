<script setup lang="ts">
import ExtractorSidebar from '@/components/layout/ExtractorSidebar.vue';

const open = ref(false);
</script>

<template>
  <div class="relative min-h-screen bg-default">
    <!-- Top bar -->
    <header class="fixed inset-x-0 top-0 z-30 border-b border-default bg-elevated/60 backdrop-blur">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-globe" class="size-5 text-primary" />
          <span class="font-semibold">Generative World</span>
        </div>
        <div class="flex items-center gap-2 sm:hidden">
          <UButton
            icon="i-lucide-panel-right"
            color="neutral"
            variant="outline"
            size="sm"
            @click="open = true"
          >
            Sidebar
          </UButton>
        </div>
      </div>
    </header>

    <!-- Sidebar (desktop) -->
    <aside class="hidden lg:block fixed right-0 top-14 bottom-0 z-20 w-[360px] p-4">
      <ExtractorSidebar />
    </aside>

    <!-- Mobile slideover -->
    <USlideover v-model:open="open" side="right" :overlay="true" class="lg:hidden">
      <template #content>
        <div class="h-full p-4">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-pickaxe" class="size-5 text-primary" />
              <h2 class="text-base font-semibold">Mining Overview</h2>
            </div>
            <UButton icon="i-lucide-x" color="neutral" variant="ghost" @click="open = false" />
          </div>
          <ExtractorSidebar />
        </div>
      </template>
    </USlideover>

    <!-- Main content area with centered canvas -->
    <main class="pt-14 lg:pr-[380px]">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
          <div
            class="w-full max-w-[1200px] aspect-[4/3] bg-elevated/40 rounded-lg ring ring-default overflow-hidden"
          >
            <WorldCanvas />
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
