<script setup lang="ts">
import { useWorldScan } from '~/composables/world/useWorldScan';

const { performScan, isScanning, lastScanResult, scanError, clearScanResult } = useWorldScan();
const testCoordinates = ref({ x: 10.5, y: 25.3 });
const searchRadius = ref(2);

const testScan = async () => {
  await performScan(testCoordinates.value.x, testCoordinates.value.y, searchRadius.value);
};
</script>

<template>
  <div class="test-page">
    <h1>Scan Test Page</h1>

    <div class="test-controls">
      <div class="coordinate-inputs">
        <label>
          X Coordinate:
          <input
            v-model.number="testCoordinates.x"
            type="number"
            aria-label="X coordinate for scan"
          />
        </label>
        <label>
          Y Coordinate:
          <input
            v-model.number="testCoordinates.y"
            type="number"
            aria-label="Y coordinate for scan"
          />
        </label>
        <label>
          Search Radius:
          <input
            v-model.number="searchRadius"
            type="number"
            min="0"
            max="5"
            step="0.5"
            aria-label="Search radius for scan"
          />
        </label>
      </div>

      <button :disabled="isScanning" class="scan-button" @click="testScan">
        {{ isScanning ? 'Scanning...' : 'Test Scan' }}
      </button>

      <button v-if="lastScanResult || scanError" class="clear-button" @click="clearScanResult">
        Clear Results
      </button>
    </div>

    <div v-if="isScanning" class="scanning-indicator">
      <div class="spinner"></div>
      <p>Scanning location ({{ testCoordinates.x }}, {{ testCoordinates.y }})...</p>
    </div>

    <div v-if="lastScanResult" class="scan-results">
      <h2>Scan Results</h2>
      <div class="result-details">
        <p><strong>Location:</strong> ({{ lastScanResult.x }}, {{ lastScanResult.y }})</p>
        <p><strong>Scanned At:</strong> {{ lastScanResult.scannedAt.toLocaleTimeString() }}</p>

        <div v-if="lastScanResult.resources.length > 0" class="resources-found">
          <h3>Resources Found:</h3>
          <div
            v-for="resource in lastScanResult.resources"
            :key="resource.type"
            class="resource-item"
          >
            <span class="resource-type">{{ resource.type }}</span>
            <span class="resource-abundance">{{ resource.abundance }}% abundance</span>
          </div>
        </div>

        <div v-else class="no-resources">
          <p>No resources found at this location.</p>
        </div>
      </div>
    </div>

    <div v-if="scanError" class="scan-error">
      <h2>Scan Error</h2>
      <p>{{ scanError.message }}</p>
      <p v-if="scanError.code"><strong>Error Code:</strong> {{ scanError.code }}</p>
    </div>

    <div class="instructions">
      <h3>Instructions:</h3>
      <ul>
        <li>Enter X and Y coordinates to scan</li>
        <li>Click "Test Scan" to perform a scan at those coordinates</li>
        <li>Try coordinates (10.5, 25.3) with radius 2 - should find IRON nearby</li>
        <li>Try coordinates (100.7, 100.2) with radius 2 - should find resources nearby</li>
        <li>
          Try coordinates (999, 999) with radius 0 - might find no resources with exact matching
        </li>
        <li>Adjust search radius to control detection sensitivity</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.test-page {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
  font-family: sans-serif;
}

.test-controls {
  margin: 2rem 0;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.coordinate-inputs {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.coordinate-inputs label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.coordinate-inputs input {
  padding: 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: 100px;
}

.scan-button,
.clear-button {
  padding: 0.75rem 1.5rem;
  margin-right: 0.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.scan-button {
  background: #3b82f6;
  color: white;
}

.scan-button:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.clear-button {
  background: #6b7280;
  color: white;
}

.scanning-indicator {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid #3b82f6;
  border-radius: 8px;
  margin: 1rem 0;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #ddd;
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

.scan-results {
  padding: 1rem;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid #10b981;
  border-radius: 8px;
  margin: 1rem 0;
}

.scan-results h2 {
  color: #10b981;
  margin: 0 0 1rem 0;
}

.result-details p {
  margin: 0.5rem 0;
}

.resources-found {
  margin-top: 1rem;
}

.resources-found h3 {
  margin: 0 0 0.5rem 0;
  color: #10b981;
}

.resource-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem;
  margin: 0.25rem 0;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 4px;
}

.resource-type {
  font-weight: bold;
  text-transform: uppercase;
}

.resource-abundance {
  color: #10b981;
  font-weight: bold;
}

.no-resources {
  text-align: center;
  opacity: 0.7;
  padding: 1rem 0;
}

.scan-error {
  padding: 1rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid #ef4444;
  border-radius: 8px;
  margin: 1rem 0;
}

.scan-error h2 {
  color: #ef4444;
  margin: 0 0 1rem 0;
}

.instructions {
  margin-top: 2rem;
  padding: 1rem;
  background: rgba(107, 114, 128, 0.1);
  border-radius: 8px;
}

.instructions h3 {
  margin: 0 0 0.5rem 0;
}

.instructions ul {
  margin: 0;
  padding-left: 1.5rem;
}

.instructions li {
  margin: 0.25rem 0;
}
</style>
