import type { ResourceType } from '#shared/types/world';
import { getResourceColor } from '~/utils/resource-colors';
import { useExtractorManager } from '~/composables/world/useExtractorManager';
import { usePlacementValidation } from '~/composables/world/usePlacementValidation';

type MinimalScan = { x: number; y: number; discovered?: { type: ResourceType } | null } | null;

interface ValidateResponse {
  valid: boolean;
  reason?: string;
  veinId?: string;
  resourceType?: string;
  claimedBy?: string | null;
  code?: string;
}

interface RendererOps {
  setPlacementPreview: (x: number, y: number, color: number, valid: boolean) => void;
  hidePlacementPreview: () => void;
}

interface RefLike<T> {
  readonly value: T;
}

interface PlacementPreviewOptions {
  currentScanResult?: RefLike<MinimalScan | undefined>;
  renderer: RendererOps;
}

export function usePlacementPreview(
  element: Ref<HTMLElement | null | undefined>,
  selectedResource: Ref<ResourceType | null>,
  options: PlacementPreviewOptions,
) {
  const worldStore = useWorldStore();
  const { setPlacementPreview, hidePlacementPreview } = options.renderer;
  const { getExtractorAt } = useExtractorManager();
  const { validate: clientValidate } = usePlacementValidation();

  const isActive = ref(false);
  const isValid = ref<boolean | null>(null);
  const message = ref<string>('');
  const cursor = ref({ x: 0, y: 0 });
  const world = ref({ x: 0, y: 0 });
  const snapped = computed(() => ({ x: Math.floor(world.value.x), y: Math.floor(world.value.y) }));
  const showPreview = computed(() => {
    const hasDiscovery = options.currentScanResult?.value?.discovered != null;
    return !!selectedResource.value && !!hasDiscovery;
  });

  const remoteValidate = useDebounceFn(async () => {
    if (!selectedResource.value) return;
    try {
      const res = await $fetch<ValidateResponse>('/api/extractors/validate', {
        method: 'POST',
        body: {
          x: snapped.value.x,
          y: snapped.value.y,
          resourceType: selectedResource.value,
        },
      });
      isValid.value = !!res.valid;
      message.value = res.valid ? 'Placement valid' : res.reason || 'Invalid placement';
    } catch (e: any) {
      isValid.value = false;
      message.value = e?.data?.message || 'Validation failed';
    }

    const color = getResourceColor(selectedResource.value);
    setPlacementPreview(snapped.value.x, snapped.value.y, color, !!isValid.value);
  }, 120);

  const handleMouseMove = (event: MouseEvent) => {
    if (!element.value || !selectedResource.value) return;

    const rect = element.value.getBoundingClientRect();
    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;

    cursor.value = { x: canvasX, y: canvasY };
    const worldCoords = worldStore.screenToWorld(canvasX, canvasY);
    world.value = { x: worldCoords.x, y: worldCoords.y };

    if (!showPreview.value) {
      isActive.value = false;
      hidePlacementPreview();
      return;
    }

    const local = clientValidate({
      x: snapped.value.x,
      y: snapped.value.y,
      resourceType: selectedResource.value,
      scanResult: options.currentScanResult?.value,
      extractorAt: (x, y) => getExtractorAt(x, y),
    });

    isActive.value = true;
    isValid.value = local.valid;
    message.value = local.valid ? 'Placement valid' : local.reason || 'Invalid placement';

    const color = getResourceColor(selectedResource.value);
    setPlacementPreview(snapped.value.x, snapped.value.y, color, !!isValid.value);

    remoteValidate();
  };

  const handleMouseLeave = () => {
    isActive.value = false;
    hidePlacementPreview();
  };

  watch(
    element,
    (el) => {
      if (!el) return;
      useEventListener(el, 'mousemove', handleMouseMove);
      useEventListener(el, 'mouseleave', handleMouseLeave);
    },
    { immediate: true },
  );

  onUnmounted(() => {
    hidePlacementPreview();
  });

  if (options.currentScanResult) {
    watch(
      () => options.currentScanResult!.value,
      (val) => {
        if (!(val as any)?.discovered) {
          isActive.value = false;
          hidePlacementPreview();
        }
      },
    );
  }

  return {
    isActive: readonly(isActive),
    isValid: readonly(isValid),
    message: readonly(message),
    cursor: readonly(cursor),
    world: readonly(world),
    snapped: readonly(snapped),
    showPreview: readonly(showPreview),
  };
}
