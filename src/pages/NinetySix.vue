<script setup lang="ts">
import BaseCanvas from '../components/BaseCanvas.vue';
import {convert, colors} from '../composables/ninety-six';

const title = '九十六色环（渐进色环）';
const intro = [
  '用同样的平均色细分方法再多做一轮：6 → 12 → 24 → 48 → 96，相邻色相差 3.75°，已经接近肉眼无法区分的连续色相。',
  '最外圈是满饱和的纯色，向内每一圈透明度降低 10%，共 10 圈。叠在白色背景上，等于不断掺入白色，得到同一色相的“浅色调（tint）”，由纯色逐渐过渡到近乎白色。',
  '点击内圈读取到的是叠在白底上之后实际看到的颜色，右侧列表则是 96 个纯色。'
];
</script>

<template>
  <base-canvas :convert="convert" :colors="colors" :title="title" :intro="intro"/>
</template>
