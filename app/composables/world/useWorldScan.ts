import type { ResourceType, ResourceVein, ScanLevel } from '#shared/types/world';

export interface ScanResult {
  x: number;
  y: number;
  resources: ReadonlyArray<{ type: ResourceType; abundance: number }>;
  scannedAt: Date;
  message?: string;
  discovered?: ResourceVein;
}

export interface ScanError {
  message: string;
  code?: string;
}

interface ApiScanResponse {
  success: boolean;
  discovered?: ResourceVein;
  coordinates: {
    worldX: number;
    worldY: number;
    chunkX: number;
    chunkY: number;
    cellX: number;
    cellY: number;
  };
  scanLevel: ScanLevel;
  timestamp: string;
  message?: string;
}

export function useWorldScan() {
  const isScanning = ref(false);
  const lastScanResult = ref<ScanResult | null>(null);
  const scanError = ref<ScanError | null>(null);

  const performScan = async (
    worldX: number,
    worldY: number,
    searchRadius: number = 2,
  ): Promise<ScanResult | null> => {
    try {
      isScanning.value = true;
      scanError.value = null;

      const response = await $fetch<ApiScanResponse>('/api/actions/scan', {
        method: 'POST',
        body: {
          x: worldX,
          y: worldY,
          searchRadius,
        },
      });

      // Convert API response to our UI format
      const resources: Array<{ type: ResourceType; abundance: number }> = [];

      if (response.discovered) {
        resources.push({
          type: response.discovered.type,
          abundance: Math.round(response.discovered.quality.purity * 100), // Convert to percentage
        });
      }

      const result: ScanResult = {
        x: response.coordinates.worldX,
        y: response.coordinates.worldY,
        resources,
        scannedAt: new Date(),
        message: response.message,
        discovered: response.discovered,
      };

      lastScanResult.value = result;
      return result;
    } catch (error) {
      console.error('Scan failed:', error);
      scanError.value = {
        message: error instanceof Error ? error.message : 'Unknown scan error',
        code: 'SCAN_FAILED',
      };
      return null;
    } finally {
      isScanning.value = false;
    }
  };

  const clearScanResult = () => {
    lastScanResult.value = null;
    scanError.value = null;
  };

  return {
    isScanning: readonly(isScanning),
    lastScanResult: readonly(lastScanResult),
    scanError: readonly(scanError),
    performScan,
    clearScanResult,
  };
}
