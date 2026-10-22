<script setup lang="ts">
import BaseCanvas from '../components/BaseCanvas.vue';
import {convert, colors} from '../composables/forty-eight';

const title = '四十八色环（RGB模型）';
const intro = [
  '从红、黄、绿、青、蓝、品红 6 个颜色出发，每一轮在相邻两色之间插入它们的平均色：6 → 12 → 24 → 48，共细分 3 轮，相邻色相差 7.5°。',
  '为什么平均色正好落在中间的色相上？在 RGB 色环的每个 60° 扇区里，一个通道恒为 255、另一个恒为 0，只有第三个通道在 0 到 255 之间线性变化，而色相角也随它线性变化。',
  '这个方法只适用于饱和度、明度都最大的色环。对一般颜色，RGB 数值的平均会偏灰，也不等于光的真实叠加（见“Gamma与线性光”）。'
];
</script>

<template>
  <base-canvas :convert="convert" :colors="colors" :title="title" :intro="intro"/>
</template>
