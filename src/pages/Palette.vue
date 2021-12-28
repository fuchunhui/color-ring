<script setup lang="ts">
import BaseCanvas from '../components/BaseCanvas.vue';
import {convert, colors} from '../composables/palette';

</script>

<template>
  <base-canvas class="palette" :convert="convert" :colors="colors"/>
</template>

<style lang="less">
.palette {
  background-color: mintcream;
}
</style>
