<script setup lang="ts">
import BaseCanvas from '../components/BaseCanvas.vue';
import {convert, colors} from '../composables/art';

const title = '美术三原色（RYB模型）';
const intro = [
  '美术里的三原色是红（R）、黄（Y）、蓝（B）：颜料混合属于减色混合，红 + 黄 = 橙，黄 + 蓝 = 绿，红 + 蓝 = 紫，三者混合接近深棕色。',
  'RYB 不是标准色彩空间，没有统一的转换公式。这里采用 Gossett 和 Chen（2004）的方法：把 (r, y, b) 看作立方体里的坐标，在 8 个角点（白、红、黄、蓝、橙、绿、紫、黑）的 RGB 颜色之间做三线性插值。',
  '左图：三个圆的重叠区域，按被哪些圆覆盖得到 r、y、b 的值（0 或 1）再转换。右图：外环是用转换公式算出的 12 色，内环是“伊登十二色环”里手工挑选的近似色，可以对比二者的差别。',
  '转换后的蓝比 RGB 的纯蓝暗得多，这正是颜料蓝的特点。'
];
</script>

<template>
  <base-canvas class="art" :convert="convert" :colors="colors" :title="title" :intro="intro"/>
</template>
