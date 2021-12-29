<script setup lang="ts">
import BaseCanvas from '../components/BaseCanvas.vue';
import cmyk from '../composables/cmyk';
</script>

<template>
  <base-canvas class="cmyk" :convert="cmyk"/>
</template>
