<script setup lang="ts">
import BaseCanvas from '../components/BaseCanvas.vue';
import {light, colors} from '../composables/light';

// 混色算法，传入指定的数字
// 画圆，按照指定的数字拆分部分
// 当前呢诶容组合

</script>

<template>
  <base-canvas class="twelve" :convert="light" :colors="colors"/>
</template>

<style lang="less">
.twelve {
  background-color: mintcream;
}
</style>
