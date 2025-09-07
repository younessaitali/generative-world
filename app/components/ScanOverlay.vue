<script setup lang="ts">
import type { DeepReadonly } from 'vue';
import type { ScanResult } from '~/composables/world/useWorldScan';
import {
  useExtractorPlacement,
  type ExtractorPlacement,
} from '~/composables/world/useExtractorPlacement';
import { useExtractorManager } from '~/composables/world/useExtractorManager';
import type { ResourceType } from '#shared/types/world';

const props = defineProps<{
  scanResult: ScanResult | DeepReadonly<ScanResult> | null;
  isScanning: boolean;
  scanError: { message: string; code?: string } | null;
}>();

const emit = defineEmits<{
  close: [];
  placingStart: [];
  extractorPlaced: [extractor: ExtractorPlacement];
}>();

const { placeExtractor, isPlacing, placementError } = useExtractorPlacement();
const { addExtractor, getExtractorAt } = useExtractorManager();

const formatResourceType = (type: string) => {
  return type.toLowerCase().replace(/_/g, ' ');
};

const getResourceColor = (type: string) => {
  const colors: Record<string, string> = {
    IRON: '#8B4513',
    COPPER: '#B87333',
    ALUMINUM: '#C0C0C0',
    GOLD: '#FFD700',
    SILVER: '#C0C0C0',
    PLATINUM: '#E5E4E2',
    TITANIUM: '#778899',
    CHROMIUM: '#E6E6E6',
    NICKEL: '#B2BEB5',
    ZINC: '#7F7F7F',
  };
  return colors[type] || '#888';
};

const handlePlaceExtractor = async (resourceType: ResourceType) => {
  if (!props.scanResult?.discovered) return;

  const { x, y } = props.scanResult;
  const existingExtractor = getExtractorAt(Math.round(x), Math.round(y));
  if (existingExtractor) {
    return;
  }

  emit('placingStart');

  const placed = await placeExtractor(x, y, resourceType);
  if (placed) {
    addExtractor(placed);
    emit('extractorPlaced', placed);
  }
};
</script>

<template>
  <div v-if="isScanning || scanResult || scanError" class="scan-overlay">
    <!-- Scanning indicator -->
    <div v-if="isScanning" class="scan-indicator">
      <div class="scan-spinner"></div>
      <p>Scanning...</p>
    </div>

    <!-- Scan results -->
    <div v-else-if="scanResult" class="scan-results">
      <div class="scan-header">
        <h3>Scan Results</h3>
        <button class="close-button" aria-label="Close scan results" @click="$emit('close')">
          ×
        </button>
      </div>
      <div class="scan-location">
        <p>
          <strong>Location:</strong> ({{ Math.round(scanResult.x) }},
          {{ Math.round(scanResult.y) }})
        </p>
        <p><strong>Scanned:</strong> {{ scanResult.scannedAt.toLocaleTimeString() }}</p>
        <p v-if="scanResult.message" class="scan-message">{{ scanResult.message }}</p>
      </div>

      <div v-if="scanResult.resources.length > 0" class="resources-found">
        <h4>Resources Found:</h4>
        <div class="resource-list">
          <div
            v-for="resource in scanResult.resources"
            :key="resource.type"
            class="resource-item"
            :style="{ borderLeftColor: getResourceColor(resource.type) }"
          >
            <span class="resource-name">{{ formatResourceType(resource.type) }}</span>
            <span class="resource-abundance">{{ resource.abundance }}%</span>
          </div>
        </div>

        <!-- Show detailed resource information if available -->
        <div v-if="scanResult.discovered" class="resource-details">
          <h5>Resource Details:</h5>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">Grade:</span>
              <span class="detail-value">{{ scanResult.discovered.quality.grade }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Yield:</span>
              <span class="detail-value">{{ scanResult.discovered.quality.yield }} units</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Depth:</span>
              <span class="detail-value">{{ scanResult.discovered.deposit.depth }}m</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Formation:</span>
              <span class="detail-value">{{ scanResult.discovered.deposit.formation }}</span>
            </div>
          </div>

          <!-- Place Extractor Button -->
          <div class="extractor-placement">
            <button
              class="place-extractor-btn"
              :disabled="
                isPlacing || !!getExtractorAt(Math.round(scanResult.x), Math.round(scanResult.y))
              "
              :style="{
                borderColor: getResourceColor(scanResult.discovered.type),
                backgroundColor: `${getResourceColor(scanResult.discovered.type)}20`,
              }"
              @click="handlePlaceExtractor(scanResult.discovered.type)"
            >
              <span v-if="isPlacing" class="placing-indicator">
                <div class="placing-spinner"></div>
                Placing...
              </span>
              <span v-else-if="getExtractorAt(Math.round(scanResult.x), Math.round(scanResult.y))">
                Extractor Exists
              </span>
              <span v-else>
                Place {{ formatResourceType(scanResult.discovered.type) }} Extractor
              </span>
            </button>

            <!-- Show placement error if any -->
            <div v-if="placementError" class="placement-error">
              {{ placementError.message }}
            </div>
          </div>
        </div>
      </div>

      <div v-else class="no-resources">
        <p>{{ scanResult.message || 'No resources detected at this location.' }}</p>
      </div>
    </div>

    <!-- Error display -->
    <div v-else-if="scanError" class="scan-error">
      <div class="scan-header">
        <h3>Scan Failed</h3>
        <button class="close-button" aria-label="Close error" @click="$emit('close')">×</button>
      </div>
      <p>{{ scanError.message }}</p>
    </div>
  </div>
</template>

<style scoped>
.scan-overlay {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 100;
  max-width: 300px;
  pointer-events: auto;
}

.scan-indicator,
.scan-results,
.scan-error {
  background: rgba(0, 0, 0, 0.9);
  border: 1px solid #333;
  border-radius: 8px;
  padding: 1rem;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.scan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.scan-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #3b82f6;
}

.close-button {
  background: none;
  border: none;
  color: #999;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.scan-indicator {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.scan-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #333;
  border-top: 2px solid #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.scan-location {
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
  opacity: 0.8;
}

.scan-location p {
  margin: 0.25rem 0;
}

.scan-message {
  font-style: italic;
  color: #10b981;
  font-weight: 500;
  margin-top: 0.5rem !important;
}

.resources-found h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  color: #10b981;
}

.resource-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.resource-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  border-left: 3px solid #888;
}

.resource-name {
  font-weight: 500;
  text-transform: capitalize;
}

.resource-abundance {
  font-weight: bold;
  color: #10b981;
}

.resource-details {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.resource-details h5 {
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  color: #3b82f6;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 3px;
  font-size: 0.85rem;
}

.detail-label {
  opacity: 0.8;
}

.detail-value {
  font-weight: 500;
  color: #10b981;
}

.no-resources {
  text-align: center;
  opacity: 0.7;
  padding: 0.5rem 0;
}

.scan-error {
  border-color: #ef4444;
}

.scan-error h3 {
  color: #ef4444;
}

.extractor-placement {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.place-extractor-btn {
  width: 100%;
  padding: 0.75rem 1rem;
  background: rgba(59, 130, 246, 0.1);
  border: 2px solid #3b82f6;
  border-radius: 6px;
  color: white;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.place-extractor-btn:hover:not(:disabled) {
  background: rgba(59, 130, 246, 0.2);
  border-color: #60a5fa;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.2);
}

.place-extractor-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.placing-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.placing-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.placement-error {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid #ef4444;
  border-radius: 4px;
  color: #ef4444;
  font-size: 0.85rem;
  text-align: center;
}
</style>
