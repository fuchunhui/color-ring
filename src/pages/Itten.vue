<script setup lang="ts">
import BaseCanvas from '../components/BaseCanvas.vue';
import {convert, colors} from '../composables/itten';

</script>

<template>
  <base-canvas class="itten" :convert="convert" :colors="colors"/>
</template>