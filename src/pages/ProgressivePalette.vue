<script setup lang="ts">
import BaseCanvas from '../components/BaseCanvas.vue';
import {convert, colors} from '../composables/progressive-palette';
// 渐进式增加的六边形
</script>

<template>
  <base-canvas class="progressive-palette" :convert="convert" :colors="colors"/>
</template>

<style lang="less">
.progressive-palette {
  background-color: mintcream;
}
</style>
