import type { PlayerData } from '~/composables/usePlayer';

export interface PlayerStatusResponse {
  success: boolean;
  player: PlayerData;
}

export async function fetchPlayerStatus(): Promise<PlayerStatusResponse> {
  return await $fetch<PlayerStatusResponse>('/api/player/status');
}

export async function updatePlayerData(data: Partial<PlayerData>): Promise<PlayerStatusResponse> {
  return await $fetch<PlayerStatusResponse>('/api/player/update', {
    method: 'POST',
    body: data,
  });
}

export async function syncPlayerInventory(
  inventory: Record<string, number>,
): Promise<PlayerStatusResponse> {
  return await $fetch<PlayerStatusResponse>('/api/player/inventory', {
    method: 'POST',
    body: { inventory },
  });
}
