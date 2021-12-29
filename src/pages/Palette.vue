<script setup lang="ts">
import BaseCanvas from '../components/BaseCanvas.vue';
import {convert, colors} from '../composables/palette';
</script>

<template>
  <base-canvas :convert="convert" :colors="colors"/>
</template>
