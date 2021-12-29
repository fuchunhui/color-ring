<script setup lang="ts">
import {computed} from 'vue';
import BaseCanvas from '../components/BaseCanvas.vue';
import {convert, colors} from '../composables/random-palette';

const randomColors = computed(() => {
  return colors;
});
</script>

<template>
  <base-canvas class="random-palette" :convert="convert" :colors="randomColors"/>
</template>

