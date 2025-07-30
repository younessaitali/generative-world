<script setup lang="ts">
import { useTemplateRef } from 'vue';
import { useWorldManager } from '~/composables/world/useWorldManager';
import { useScanInteraction } from '~/composables/world/useScanInteraction';

const canvasContainer = useTemplateRef<HTMLElement>('canvasContainer');

// Only initialize world manager on client side
const worldManager = import.meta.client
  ? useWorldManager(canvasContainer, {
      rendererConfig: {
        width: 800, // Default fallback values
        height: 600,
        backgroundColor: 0x1a1a1a,
      },
      enableInteractions: true,
      debounceDuration: 250,
    })
  : null;

const scanInteraction = import.meta.client
  ? useScanInteraction(canvasContainer, {
      enableKeyboardScan: true,
      enableRightClickScan: true,
      scanKey: 'KeyF',
    })
  : null;

onMounted(async () => {
  if (!worldManager) return;

  await nextTick();

  if (!canvasContainer.value) {
    console.error('Canvas container not available after mount');
    return;
  }

  try {
    await worldManager.initialize();

    if (canvasContainer.value) {
      worldManager.resize(canvasContainer.value.clientWidth, canvasContainer.value.clientHeight);
    }

    console.log('World canvas initialized successfully');
  } catch (error) {
    console.error('Failed to initialize world canvas:', error);
  }
});

// Expose for debugging (only on client-side)
if (import.meta.dev && import.meta.client && worldManager) {
  onMounted(() => {
    // @ts-expect-error - Exposing for debugging in development
    window.worldManager = worldManager;
  });
}

const handleCloseScanResult = () => {
  scanInteraction?.clearScanResult();
};
</script>

<template>
  <ClientOnly>
    <div ref="canvasContainer" class="world-canvas-container">
      <!-- Loading overlay -->
      <div v-if="worldManager?.isLoading?.value" class="loading-overlay">
        <div class="loading-spinner" />
        <p>Loading world...</p>
      </div>

      <!-- Error overlay -->
      <div v-if="worldManager?.error?.value" class="error-overlay">
        <div class="error-content">
          <h3>Failed to load world</h3>
          <p>{{ worldManager.error.value.message }}</p>
          <button class="retry-button" @click="worldManager?.initialize?.()">Retry</button>
        </div>
      </div>

      <!-- Scan overlay -->
      <ScanOverlay
        v-if="scanInteraction"
        :scan-result="scanInteraction.lastScanResult?.value"
        :is-scanning="scanInteraction.isScanning?.value"
        :scan-error="scanInteraction.scanError?.value"
        @close="handleCloseScanResult"
      />

      <!-- Instructions overlay -->
      <div
        v-if="!worldManager?.isLoading?.value && !worldManager?.error?.value"
        class="instructions-overlay"
      >
        <p><strong>Controls:</strong></p>
        <p>• Drag to pan</p>
        <p>• Scroll to zoom</p>
        <p>• Press <kbd>F</kbd> to scan at cursor</p>
        <p>• Right-click to scan location</p>
      </div>
    </div>
    <template #fallback>
      <div class="world-canvas-container">
        <div class="loading-overlay">
          <div class="loading-spinner" />
          <p>Loading world canvas...</p>
        </div>
      </div>
    </template>
  </ClientOnly>
</template>

<style scoped>
.world-canvas-container {
  position: fixed;
  top: 5vh;
  left: 5vh;
  width: 90vw;
  height: 90vh;
  margin: 0;
  padding: 0;
  z-index: 1;
  user-select: none;
  cursor: grab;
  border: solid 1px red;
  overflow: hidden;
}

.world-canvas-container:active {
  cursor: grabbing;
}

.world-canvas-container :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  z-index: 10;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #333;
  border-top: 4px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.9);
  z-index: 10;
}

.error-content {
  text-align: center;
  color: white;
  padding: 2rem;
  background: rgba(255, 0, 0, 0.1);
  border: 1px solid #ef4444;
  border-radius: 8px;
}

.error-content h3 {
  margin: 0 0 1rem 0;
  color: #ef4444;
}

.error-content p {
  margin: 0 0 1.5rem 0;
  opacity: 0.8;
}

.retry-button {
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.retry-button:hover {
  background: #2563eb;
}

.instructions-overlay {
  position: absolute;
  bottom: 20px;
  left: 20px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  z-index: 10;
  pointer-events: none;
}

.instructions-overlay p {
  margin: 0.25rem 0;
}

.instructions-overlay kbd {
  background: rgba(255, 255, 255, 0.2);
  padding: 0.125rem 0.25rem;
  border-radius: 3px;
  font-family: monospace;
  font-size: 0.75rem;
}
</style>
