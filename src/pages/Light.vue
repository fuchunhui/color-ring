<script setup lang="ts">
import BaseCanvas from '../components/BaseCanvas.vue';
import {light, colors} from '../composables/light';
</script>

<template>
  <base-canvas :convert="light" :colors="colors"/>
</template>
