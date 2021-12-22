<script setup lang="ts">
import {onMounted} from 'vue';
import Color from '../base/color';
import {hsva, hsla} from '../utils/color';

onMounted(() => {
  const color = new Color('8e9e10');

  console.log('hex: ', color.toHex());
  console.log('hsv--: ', color.toHSV());

  const {h, s, v, a} = color.toHSV();
  const newHSV = hsva(h, s, v, a);
  console.log('hsv --> rgb转换', newHSV.toHex());

  console.log('hsl ----->', color.toHSL());
  const {h: lh, s: ls, l: ll, a: la} = color.toHSL();
  const newHSL = hsla(lh, ls, ll, la);
  console.log('hsl --> rgb转换', newHSL.toHex());
});

</script>

<template>
  <div>
    abbb
  </div>
</template>

<style lang="less">

</style>