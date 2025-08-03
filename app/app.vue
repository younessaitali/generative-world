<template>
  <NuxtPage />
</template>

<script setup lang="ts">
import { useHead } from '#imports';

useHead({
  title: 'Generative World Explorer',
  meta: [
    {
      name: 'description',
      content: 'A real-time generative world explorer using PixiJS and WebGL',
    },
  ],
});
</script>
