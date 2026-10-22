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
  'hard-light', 'soft-light', 'difference', 'exclusion',
  'hue', 'saturation', 'color', 'luminosity'
];
</script>

<template>
  <div class="compositing">
    <h3 class="compositing-h3">
      图形合成：Compositing 与 Blending
    </h3>
    <p class="compositing-desc">
      把两张半透明的图叠在一起，结果是什么颜色？这包含两个问题：谁保留、谁被遮住（合成，Compositing，由 alpha 决定），以及重叠处的颜色怎么算（混合，Blending，由颜色通道决定）。
      在 Canvas 里，先画上去的内容叫 destination（目标，红色方块），后画的叫 source（源，蓝色方块），二者如何合成由 globalCompositeOperation 指定。
    </p>
    <div class="compositing-title">
      <composite-source/>
      <composite-destination/>
    </div>
    <h3 class="compositing-h3">
      应用各种混合效果的结果
    </h3>
    <p class="compositing-desc">
      这 12 种是 Porter–Duff 合成运算（lighter 除外）：source-over 是默认值，新图盖在旧图上；source-in / source-out 只保留 source 在 destination 里面 / 外面的部分；
      source-atop 把 source 只画在 destination 上；xor 保留互不重叠的部分；copy 只留 source；lighter 把颜色和 alpha 直接相加，不属于 Porter–Duff。
      带 destination 前缀的则反过来，以 destination 为主。clear 一格是空的：本页对它连红色方块也用 clear 绘制，所以什么都没剩下。
    </p>
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
    <p class="compositing-desc">
      Porter–Duff 把每个像素划成四个子区域：只有 source、只有 destination、两者重叠（both）、两者都没有（none）。
      每种合成运算，就是规定这四个区域各自保留 source、保留 destination，还是变成透明。左图两者 alpha 为 0.5，右图为 1。
      图中用 lighter 叠加只是为了把四个区域标出来，并不代表各区域的真实面积占比（真实占比是 αs·αb 等）。
    </p>
    <div class="compositing-model">
      <composite-feature :alpha="0.5"/>
      <composite-feature :alpha="1"/>
    </div>
    <h3 class="compositing-h3">
      Blending
    </h3>
    <p class="compositing-desc">
      混合模式决定“重叠区域”的颜色怎么算：对每个通道用函数 B(Cb, Cs) 由背景色 Cb 和源色 Cs 得到混合色，再按 W3C 公式代入两者的 alpha。
      multiply 相乘变暗，screen 取反相乘再取反变亮，overlay 暗部相乘、亮部屏幕，加强对比，difference 取绝对差；
      hue、saturation、color、luminosity 是非分量混合，分别取源色的色相 / 饱和度 / 色相加饱和度 / 亮度，配上背景的其余部分。
      每格的大图是 Canvas 的结果，右上角的小方块是本项目用同一公式在代码里算出的结果，二者应当一致（取整可能差 1）。
    </p>
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
  &-desc {
    max-width: 900px;
    margin: 4px 0 8px;
    font-size: 13px;
    line-height: 21px;
    color: #666;
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
