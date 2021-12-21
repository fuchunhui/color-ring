<script setup lang="ts">
import ColorDetail from './ColorDetail.vue';
import Color from '../../base/color';

const props = defineProps<{
  colors: Color[]
}>();

console.log('list------>', props.colors);

</script>

<template>
  <div class="color-list">
    list
    <color-detail/>
  </div>
</template>

<style lang="less">
.color-list {
  background-color: magenta;
}
</style>