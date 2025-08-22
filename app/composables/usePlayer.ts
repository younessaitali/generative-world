import { ref, computed, readonly } from '#imports';
import { defineStore } from 'pinia';
import { useLocalStorage } from '@vueuse/core';
import { fetchPlayerStatus } from '~/api/player';

export interface PlayerData {
  id: string;
  sessionId: string;
  name: string;
  inventory: Record<string, number>;
  credits: number;
  lastActive: string;
  createdAt: string;
}

export const usePlayerStore = defineStore('player', () => {
  const sessionId = useLocalStorage<string | null>('player-session-id', null);

  const data = ref<PlayerData | null>(null);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => data.value !== null);
  const playerId = computed(() => data.value?.id);
  const playerName = computed(() => data.value?.name || 'Anonymous Player');

  const setPlayerData = (playerData: PlayerData) => {
    data.value = playerData;
    error.value = null;
    sessionId.value = playerData.sessionId;
  };

  const clearPlayer = () => {
    data.value = null;
    error.value = null;
    sessionId.value = null;
  };

  const setError = (errorMessage: string) => {
    error.value = errorMessage;
  };

  const clearError = () => {
    error.value = null;
  };

  const inventory = computed(() => data.value?.inventory || {});

  const updateInventory = (newInventory: Record<string, number>) => {
    if (data.value) {
      data.value.inventory = { ...newInventory };
    }
  };

  const addToInventory = (resourceType: string, amount: number) => {
    if (data.value) {
      const currentAmount = data.value.inventory[resourceType] || 0;
      data.value.inventory[resourceType] = currentAmount + amount;
    }
  };

  const removeFromInventory = (resourceType: string, amount: number): boolean => {
    if (data.value) {
      const currentAmount = data.value.inventory[resourceType] || 0;
      if (currentAmount >= amount) {
        data.value.inventory[resourceType] = currentAmount - amount;
        return true;
      }
    }
    return false;
  };

  const getResourceAmount = (resourceType: string): number => {
    return data.value?.inventory[resourceType] || 0;
  };

  const credits = computed(() => data.value?.credits || 0);

  const updateCredits = (newCredits: number) => {
    if (data.value) {
      data.value.credits = newCredits;
    }
  };

  const { refresh: refreshPlayer, pending: isLoading } = useFetch('/api/player/status', {
    key: 'player-status',
    server: false,
    onResponse({ response }) {
      if (response._data?.success && response._data?.player) {
        setPlayerData(response._data.player);
        clearError();
      }
    },
    onResponseError({ error: fetchError }) {
      console.error('Failed to refresh player:', fetchError);
      setError('Failed to refresh player data');
    },
  });

  const initializePlayer = async (): Promise<void> => {
    try {
      clearError();
      const response = await fetchPlayerStatus();

      if (response.success && response.player) {
        setPlayerData(response.player);
      } else {
        throw new Error('Failed to fetch player data');
      }
    } catch (err) {
      console.error('Failed to initialize player:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    }
  };

  return {
    player: readonly(data),
    isAuthenticated,
    playerId,
    sessionId: readonly(sessionId),
    playerName,
    inventory,
    addToInventory,
    removeFromInventory,
    updateInventory,
    getResourceAmount,
    credits,
    updateCredits,
    error: readonly(error),
    isLoading: readonly(isLoading),
    initializePlayer,
    refreshPlayer,
    clearPlayer,
  };
});
