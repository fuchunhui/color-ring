<script setup lang="ts">
import BaseCanvas from '../components/BaseCanvas.vue';
import {convert, colors} from '../composables/itten';

const title = '伊登十二色环（RYB近似）';
const intro = [
  '约翰内斯·伊登（Johannes Itten）是瑞士画家，也是包豪斯早期的教师。他的色环以黄、红、蓝为三原色，而不是光的红、绿、蓝，更接近颜料混合的经验。',
  '中间的大三角形是三原色；外围六角星多出来的三个小三角形是二次色：橙（红 + 黄）、绿（黄 + 蓝）、紫（红 + 蓝）；外环 12 色再加上六个三次色。',
  '互补色：红 ↔ 绿，黄 ↔ 紫，蓝 ↔ 橙，与 RGB 色环不同。',
  '说明：RYB 不是物理上的色彩空间，屏幕只能用 sRGB 显示。这里的 12 个颜色是手工挑选的近似值，色相间隔并不均匀（橙色区域占 4 格，蓝到绿只占 2 格）。想看真正的 RYB → RGB 转换，请见“美术三原色”。'
];
</script>

<template>
  <base-canvas class="itten" :convert="convert" :colors="colors" :title="title" :intro="intro"/>
</template>
