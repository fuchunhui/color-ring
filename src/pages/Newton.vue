<script setup lang="ts">
import BaseCanvas from '../components/BaseCanvas.vue';
import {newton, colors} from '../composables/newton';
import '../test/model';

// 混色算法，传入指定的数字
// 画圆，按照指定的数字拆分部分
// 当前内容组合

</script>

<template>
  <base-canvas class="newton" :convert="newton" :colors="colors"/>
</template>

<style lang="less">
.newton {
  background-color: mintcream;
}
</style>
