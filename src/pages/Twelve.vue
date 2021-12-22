<script setup lang="ts">
import {onMounted} from 'vue';
import Color from '../base/color';
import {hsva, hsla, mix} from '../utils/color';

onMounted(() => {
  const color = new Color('8e9e10');
  console.log('原始hex: ', color.toHex());
  console.log('原始rgb: ', color.rgb());

  console.log('test ------ hsv ----->', color.toHSV());
  const {h, s, v, a} = color.toHSV();
  const newHSV = hsva(h, s, v, a);
  console.log('hsv --> rgb转换', newHSV.toHex());

  console.log('test ------ hsl ----->', color.toHSL());
  const {h: lh, s: ls, l: ll, a: la} = color.toHSL();
  const newHSL = hsla(lh, ls, ll, la);
  console.log('hsl --> rgb转换', newHSL.toHex());

  const color1 = new Color('ff0000');
  const color2 = new Color('0000ff');
  console.log('test ------ mix ----->', color1.toHex(), color2.toHex(), 0.5);
  const mixColor = mix(color1, color2, 0.5);
  console.log(mixColor.rgba(), mixColor.toHex());
});

</script>

<template>
  <div>
    abbb
  </div>
</template>

<style lang="less">

</style>