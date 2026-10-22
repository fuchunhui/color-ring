<script setup lang="ts">
import BaseCanvas from '../components/BaseCanvas.vue';
import {convert, colors} from '../composables/progressive-palette';

const title = '渐进式的调色板';
const intro = [
  '这是一个 721 格的六边形蜂窝（中心 1 格，向外共 15 圈）。第 i 格的颜色取 HSL（饱和度 100%，亮度 50%）色相 i / 721 × 360°，也就是色相从 0° 一路渐变到接近 360°。',
  '格子的排列顺序是从中心向外一圈一圈，每圈六条边依次排列，所以红 → 黄 → 绿 → 青 → 蓝 → 品红的渐变沿着这个顺序“盘旋”展开，形成分层的螺旋图案。',
  '相邻两格的色相只差约 0.5°，肉眼几乎看不出分界，这也是“连续色相”在屏幕上的样子。'
];
</script>

<template>
  <base-canvas :convert="convert" :colors="colors" :title="title" :intro="intro"/>
</template>
