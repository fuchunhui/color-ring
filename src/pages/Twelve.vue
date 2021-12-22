<script setup lang="ts">
import {onMounted} from 'vue';
import Color from '../base/color';
import {hsva} from '../utils/color';

onMounted(() => {
  const color = new Color('123456');

  console.log('hex: ', color.toHex());
  console.log('hsv: ', color.toHSV());

  const {h, s, v, a} = color.toHSV();
  const newc = hsva(h, s, v, a);
  console.log(newc.toHex());
});

</script>

<template>
  <div>
    abbb
  </div>
</template>

<style lang="less">

</style>