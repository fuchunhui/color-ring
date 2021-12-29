<script setup lang="ts">
import BaseCanvas from '../components/BaseCanvas.vue';
import {convert, colors} from '../composables/forty-eight';
</script>

<template>
  <base-canvas :convert="convert" :colors="colors"/>
</template>
