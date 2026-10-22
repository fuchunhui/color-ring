<script setup lang="ts">
import BaseCanvas from '../components/BaseCanvas.vue';
import {convert, colors} from '../composables/art';
</script>

<template>
  <base-canvas class="art" :convert="convert" :colors="colors"/>
</template>
