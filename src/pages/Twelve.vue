<script setup lang="ts">
import {onMounted} from 'vue';
import Color from '../base/color';

onMounted(() => {
  const color = new Color('ffff00');
  console.log({...color});
  console.log('hex: ', color.toHex());
});

</script>

<template>
  <div>
    abbb
  </div>
</template>

<style lang="less">

</style>