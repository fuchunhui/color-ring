<script setup lang="ts">
import BaseCanvas from '../components/BaseCanvas.vue';
import {twelve, colors} from '../composables/twelve';

// 混色算法，传入指定的数字
// 画圆，按照指定的数字拆分部分
// 当前内容组合

</script>

<template>
  <base-canvas class="twelve" :convert="twelve" :colors="colors"/>
</template>

<style lang="less">
.twelve {
  background-color: mintcream;
}
</style>
