import { useWorldScan } from '~/composables/world/useWorldScan';

export interface UseScanInteractionOptions {
  enableKeyboardScan?: boolean;
  enableRightClickScan?: boolean;
  scanKey?: string;
}

export function useScanInteraction(
  element: Ref<HTMLElement | null | undefined>,
  options: UseScanInteractionOptions = {},
) {
  const { enableKeyboardScan = true, enableRightClickScan = true, scanKey = 'KeyF' } = options;

  const worldStore = useWorldStore();
  const { performScan, isScanning, lastScanResult, scanError, clearScanResult } = useWorldScan();

  const lastMousePosition = ref({ x: 0, y: 0 });

  const handleScanAtPosition = async (screenX: number, screenY: number) => {
    if (isScanning.value || !element.value) return;

    const rect = element.value.getBoundingClientRect();
    const canvasX = screenX - rect.left;
    const canvasY = screenY - rect.top;

    const worldCoords = worldStore.screenToWorld(canvasX, canvasY);

    console.log(
      `Scanning at screen: (${canvasX}, ${canvasY}) -> world: (${worldCoords.x}, ${worldCoords.y})`,
    );

    await performScan(worldCoords.x, worldCoords.y);
  };

  const handleKeyDown = async (event: KeyboardEvent) => {
    if (!enableKeyboardScan || isScanning.value) return;

    if (event.code === scanKey) {
      event.preventDefault();
      await handleScanAtPosition(lastMousePosition.value.x, lastMousePosition.value.y);
    }
  };

  const handleMouseMove = (event: MouseEvent) => {
    lastMousePosition.value = { x: event.clientX, y: event.clientY };
  };

  const handleContextMenu = async (event: MouseEvent) => {
    if (!enableRightClickScan || isScanning.value) return;

    event.preventDefault();
    await handleScanAtPosition(event.clientX, event.clientY);
  };

  const setupEventListeners = () => {
    if (!element.value) return;

    if (enableKeyboardScan) {
      useEventListener(window, 'keydown', handleKeyDown);
      useEventListener(element, 'mousemove', handleMouseMove);
    }

    if (enableRightClickScan) {
      useEventListener(element, 'contextmenu', handleContextMenu);
    }
  };

  watch(
    element,
    (newElement) => {
      if (newElement) {
        setupEventListeners();
      }
    },
    { immediate: true },
  );

  return {
    isScanning,
    lastScanResult,
    scanError,
    performScan,
    clearScanResult,
    handleScanAtPosition,
    scanKey,
    enableKeyboardScan,
    enableRightClickScan,
  };
}
