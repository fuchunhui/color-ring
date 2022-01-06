<script setup lang="ts">
import {provide} from 'vue';
import CompositeCell from '../components/composite/CompositeCell.vue';
import CompositeSource from '../components/composite/CompositeSource.vue';
import CompositeDestination from '../components/composite/CompositeDestination.vue';

provide('size', 160);

const compositeList = [
  'clear', 'copy', 'source-over', 'destination-over',
  'source-in', 'destination-in', 'source-out', 'destination-out',
  'source-atop', 'destination-atop', 'xor', 'lighter'
];
const whiteList = [
  true, true, true, true, 
  true, true, true, true, 
  true, true, true, true 
];
</script>

<template>
  <div class="compositing">
    <div class="compositing-title">
      <composite-source/>
      <composite-destination/>
    </div>
    <div class="compositing-item">
      <composite-cell
        v-for="(item, index) in compositeList"
        :key="item"
        :operator="item"
        :white="whiteList[index]"
      />
    </div>
  </div>
</template>

<style lang="less">
.compositing {
  &-title {
    display: flex;
  }
  .composite-source {
    margin-right: 40px;
  }
  &-item {
    display: grid;
    grid-template-columns: repeat(auto-fill, 200px);
    grid-template-rows: 200px;
  }
}
</style>
