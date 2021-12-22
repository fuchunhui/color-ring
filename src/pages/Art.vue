<script setup lang="ts">
import BaseCanvas from '../components/BaseCanvas.vue';
import art from '../composables/art';

import {onMounted} from 'vue';
// import {rybtorgb, rgbToRyb} from '../../.draft/ryb1'; // 看起来不是正确的转换算法

// github 关于ryb to rgb的内容，供参考 https://github.com/search?l=JavaScript&p=1&q=rybtorgb&type=Code

onMounted(() => {
  // const ryb = {
  //   r: 170,
  //   y: 87,
  //   b: 134,
  //   a: 1
  // };
  // const rgb = {
  //   r: 128,
  //   g: 0,
  //   b: 255,
  //   a: 1
  // };

  // const toRGB = rybtorgb(ryb);
  // console.log('rgb#: ', toRGB);

  // const toRYB = rgbToRyb(rgb);
  // console.log('ryb: ', toRYB);
});
</script>

<template>
  <base-canvas class="art" :convert="art"/>
</template>

<style lang="less">
.art {
  background-color: mintcream;
}
</style>