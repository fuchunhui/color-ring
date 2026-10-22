<script setup lang="ts">
import BaseCanvas from '../components/BaseCanvas.vue';
import {convert, colors} from '../composables/palette';

const title = '调色板（六边形蜂窝）';
const intro = [
  '217 个正六边形按蜂窝方式排列：中心 1 格，向外共 8 圈，每圈比上一圈多 6 格。正六边形能无缝铺满平面，所以比圆形更适合做调色板的格子。',
  '每个颜色都是随机的 12 位色（#RGB 简写，每个通道只有 16 级），再按 HSL 亮度从高到低、亮度相同时按色相排序，所以中心最亮、向外逐渐变暗。',
  '点击任意一格读取颜色，右侧列表按同样的顺序列出全部颜色。刷新页面会重新生成一组。'
];
</script>

<template>
  <base-canvas :convert="convert" :colors="colors" :title="title" :intro="intro"/>
</template>
