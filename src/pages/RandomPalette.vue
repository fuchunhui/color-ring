<script setup lang="ts">
import BaseCanvas from '../components/BaseCanvas.vue';
import {convert, colors} from '../composables/random-palette';
// 动态添加随机点。
</script>

<template>
  <base-canvas class="random-palette" :convert="convert" :colors="colors"/>
</template>

<style lang="less">
.random-palette {
  background-color: mintcream;
}
</style>
