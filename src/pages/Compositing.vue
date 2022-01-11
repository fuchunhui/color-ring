<script setup lang="ts">
import {provide} from 'vue';
import CompositeCell from '../components/composite/CompositeCell.vue';
import CompositeSource from '../components/composite/CompositeSource.vue';
import CompositeDestination from '../components/composite/CompositeDestination.vue';
import CompositeFeature from '../components/composite/CompositeFeature.vue';
import BlendingCell from '../components/composite/BlendingCell.vue';

provide('size', 160);

const compositeList = [
  'clear', 'copy', 'source-over', 'destination-over',
  'source-in', 'destination-in', 'source-out', 'destination-out',
  'source-atop', 'destination-atop', 'xor', 'lighter'
];
const whiteList = [
  true, false, false, false, 
  false, false, false, false,
  false, false, false, false
];
const blendingList = [
  'normal', 'multiply', 'screen', 'overlay',
  'darken', 'lighten', 'color-dodge', 'color-burn',
  'hard-light', 'soft-light', 'difference', 'exclusion'
];
</script>

<template>
  <div class="compositing">
    <div class="compositing-title">
      <composite-source/>
      <composite-destination/>
    </div>
    <h3 class="compositing-h3">
      应用各种混合效果的结果
    </h3>
    <div class="compositing-item">
      <composite-cell
        v-for="(item, index) in compositeList"
        :key="item"
        :operator="item"
        :white="whiteList[index]"
      />
    </div>
    <h3 class="compositing-h3">
      解释原理：颜色模型的4个子区域
    </h3>
    <div class="compositing-model">
      <composite-feature :alpha="0.5"/>
      <composite-feature :alpha="1"/>
    </div>
    <h3 class="compositing-h3">
      Blending
    </h3>
    <div class="compositing-item">
      <blending-cell
        v-for="item in blendingList"
        :key="item"
        :formula="item"
      />
    </div>
  </div>
</template>

<style lang="less">
.compositing {
  margin-bottom: 20px;
  overflow: auto;
  &-title {
    display: flex;
  }
  &-h3 {
    padding-top: 10px;
    height: 30px;
  }
  .composite-source,
  .composite-destination {
    margin-right: 40px;
  }
  &-model {
    display: flex;
  }
  &-item {
    display: grid;
    grid-template-columns: repeat(auto-fill, 200px);
    grid-template-rows: 200px;
  }
}
</style>
