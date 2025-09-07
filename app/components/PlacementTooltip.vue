<script setup lang="ts">
import type { ResourceType } from '#shared/types/world';

const props = defineProps<{
  cursor: { x: number; y: number };
  isActive: boolean;
  isValid: boolean | null;
  message: string;
  resourceType: ResourceType | null;
}>();

const statusText = computed(() => (props.isValid ? 'Valid' : 'Invalid'));
const statusColor = computed(() => (props.isValid ? '#10b981' : '#ef4444'));

const styleObject = computed(() => ({
  left: `${props.cursor.x + 16}px`,
  top: `${props.cursor.y + 16}px`,
}));
</script>

<template>
  <div v-if="isActive && resourceType" class="placement-tooltip" :style="styleObject">
    <div class="row">
      <span class="label">Resource:</span>
      <span class="value">{{ resourceType.toLowerCase().replace(/_/g, ' ') }}</span>
    </div>
    <div class="row">
      <span class="label">Status:</span>
      <span class="value" :style="{ color: statusColor }">{{ statusText }}</span>
    </div>
    <div v-if="!isValid && message" class="error">{{ message }}</div>
  </div>
  <div v-else-if="isActive" class="placement-tooltip" :style="styleObject">
    <div class="row"><span class="value">Hover a discovered tile</span></div>
  </div>
</template>

<style scoped>
.placement-tooltip {
  position: absolute;
  z-index: 200;
  background: rgba(0, 0, 0, 0.85);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  padding: 8px 10px;
  font-size: 12px;
  pointer-events: none;
  min-width: 180px;
  max-width: 280px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}
.row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.label {
  opacity: 0.7;
}
.value {
  font-weight: 600;
}
.error {
  margin-top: 6px;
  color: #ef4444;
  font-weight: 500;
}
</style>
