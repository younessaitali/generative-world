import type { CameraEvent } from '#shared/types/world';

export interface UseInteractionOptions {
  enablePanning?: boolean;
  enableZooming?: boolean;
  zoomSensitivity?: number;
}

export function useWorldInteraction(
  element: Ref<HTMLElement | null | undefined>,
  options: UseInteractionOptions = {},
) {
  const { enablePanning = true, enableZooming = true, zoomSensitivity = 0.001 } = options;

  const isDragging = ref(false);
  const lastMousePosition = ref({ x: 0, y: 0 });

  const cameraEvents = ref<CameraEvent[]>([]);

  const emitCameraEvent = (event: CameraEvent) => {
    cameraEvents.value.push(event);
    nextTick(() => {
      cameraEvents.value = [];
    });
  };

  const handleMouseDown = (event: MouseEvent) => {
    if (!enablePanning) return;

    isDragging.value = true;
    lastMousePosition.value = { x: event.clientX, y: event.clientY };

    event.preventDefault();
  };

  const throttledHandleMouseMove = useThrottleFn((event: MouseEvent) => {
    if (!isDragging.value || !enablePanning) return;

    const deltaX = event.clientX - lastMousePosition.value.x;
    const deltaY = event.clientY - lastMousePosition.value.y;

    emitCameraEvent({
      type: 'pan',
      deltaX,
      deltaY,
    });

    lastMousePosition.value = { x: event.clientX, y: event.clientY };
  }, 16);

  const handleMouseMove = (event: MouseEvent) => {
    throttledHandleMouseMove(event);
  };

  const handleMouseUp = () => {
    isDragging.value = false;
  };

  const throttledHandleWheel = useThrottleFn((event: WheelEvent) => {
    if (!enableZooming || !element.value) return;

    event.preventDefault();

    const rect = element.value.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const zoomDelta = -event.deltaY;

    emitCameraEvent({
      type: 'zoom',
      zoomDelta,
      mouseX,
      mouseY,
    });
  }, 16);

  const handleWheel = (event: WheelEvent) => {
    throttledHandleWheel(event);
  };

  const handleTouchStart = (event: TouchEvent) => {
    if (!enablePanning || event.touches.length !== 1) return;

    const touch = event.touches[0];
    if (!touch) return;

    isDragging.value = true;
    lastMousePosition.value = { x: touch.clientX, y: touch.clientY };

    event.preventDefault();
  };

  const handleTouchMove = (event: TouchEvent) => {
    if (!isDragging.value || !enablePanning || event.touches.length !== 1) return;

    const touch = event.touches[0];
    if (!touch) return;

    const deltaX = touch.clientX - lastMousePosition.value.x;
    const deltaY = touch.clientY - lastMousePosition.value.y;

    emitCameraEvent({
      type: 'pan',
      deltaX,
      deltaY,
    });

    lastMousePosition.value = { x: touch.clientX, y: touch.clientY };
    event.preventDefault();
  };

  const handleTouchEnd = () => {
    isDragging.value = false;
  };

  const setupEventListeners = () => {
    if (!element.value) return;

    useEventListener(element, 'mousedown', handleMouseDown);
    useEventListener(window, 'mousemove', handleMouseMove);
    useEventListener(window, 'mouseup', handleMouseUp);
    useEventListener(element, 'wheel', handleWheel, { passive: false });

    useEventListener(element, 'touchstart', handleTouchStart, { passive: false });
    useEventListener(element, 'touchmove', handleTouchMove, { passive: false });
    useEventListener(element, 'touchend', handleTouchEnd);
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

  const onCameraEvent = (callback: (event: CameraEvent) => void) => {
    watch(
      cameraEvents,
      (events) => {
        events.forEach(callback);
      },
      { deep: true },
    );
  };

  return {
    isDragging: readonly(isDragging),
    cameraEvents: readonly(cameraEvents),
    onCameraEvent,
    emitCameraEvent,
    enablePanning,
    enableZooming,
    zoomSensitivity,
  };
}
