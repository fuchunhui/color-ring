<script setup lang="ts">
import CompositeCell from '../components/CompositeCell.vue';

const compositeList = [
  'clear', 'copy', 'source-over', 'destination-over',
  'source-in', 'destination-in', 'source-out', 'destination-out',
  'source-atop', 'destination-atop', 'xor', 'lighter'
];
</script>

<template>
  <div class="compositing">
    123
    // 原始图形
    // 4 * 3的对比效果展示。
    <div>
      source and dest
    </div>
    <div class="compositing-item">
      <composite-cell
        v-for="item in compositeList"
        :key="item"
        :operator="item"
      />
    </div>
  </div>
</template>

<style lang="less">
.compositing {
  &-item {
    display: grid;
    grid-template-columns: repeat(auto-fill, 200px);
    grid-template-rows: 200px;
  }
}
</style>
