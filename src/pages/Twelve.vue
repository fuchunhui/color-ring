<script setup lang="ts">
import BaseCanvas from '../components/BaseCanvas.vue';
import {twelve, colors} from '../composables/twelve';
</script>

<template>
  <base-canvas :convert="twelve" :colors="colors"/>
</template>
