<script setup lang="ts">
defineProps<{
  isActive: boolean;
  isValid: boolean | null;
  message: string;
  cursor: { x: number; y: number };
}>();
</script>

<template>
  <div
    v-if="isActive"
    class="absolute pointer-events-none z-50"
    :style="{ left: `${cursor.x + 14}px`, top: `${cursor.y + 14}px` }"
  >
    <div
      class="px-2 py-1 rounded text-xs shadow"
      :class="isValid ? 'bg-emerald-600/90 text-white' : 'bg-red-600/90 text-white'"
    >
      {{ message }}
    </div>
  </div>
</template>
