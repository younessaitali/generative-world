<script setup lang="ts">
useHead({
  title: 'Generative World Explorer',
  meta: [
    {
      name: 'description',
      content: 'A real-time generative world explorer using PixiJS and WebGL',
    },
  ],
});

const { initializePlayer } = usePlayerStore();

onMounted(async () => {
  try {
    await initializePlayer();
    console.log('Player system initialized successfully');
  } catch (initError) {
    console.error('Failed to initialize player system:', initError);
  }
});
</script>

<template>
  <UApp>
    <NuxtPage />
  </UApp>
</template>
