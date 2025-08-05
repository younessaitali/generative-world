import type { PlayerData } from '~/composables/usePlayer';

export interface PlayerStatusResponse {
  success: boolean;
  player: PlayerData;
}

export async function fetchPlayerStatus(): Promise<PlayerStatusResponse> {
  const response = await $fetch<PlayerStatusResponse>('/api/player/status');
  return response;
}

export async function updatePlayerData(data: Partial<PlayerData>): Promise<PlayerStatusResponse> {
  const response = await $fetch<PlayerStatusResponse>('/api/player/update', {
    method: 'POST',
    body: data,
  });
  return response;
}

export async function syncPlayerInventory(
  inventory: Record<string, number>,
): Promise<PlayerStatusResponse> {
  const response = await $fetch<PlayerStatusResponse>('/api/player/inventory', {
    method: 'POST',
    body: { inventory },
  });
  return response;
}
