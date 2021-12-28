<script setup lang="ts">
import BaseCanvas from '../components/BaseCanvas.vue';
import {convert, colors} from '../composables/forty-eight';
import '../test/model';

// 混色算法，传入指定的数字
// 画圆，按照指定的数字拆分部分
// 当前内容组合

</script>

<template>
  <base-canvas class="forty-eight" :convert="convert" :colors="colors"/>
</template>

<style lang="less">
.forty-eight {
  background-color: mintcream;
}
</style>
