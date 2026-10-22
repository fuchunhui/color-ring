<script setup lang="ts">
import BaseCanvas from '../components/BaseCanvas.vue';
import {convert, colors} from '../composables/cmyk';

const title = '印刷四色：减色混合';
const intro = [
  '印刷品自己不发光，油墨吸收一部分光，把剩下的反射给眼睛，所以油墨叠得越多画面越暗，这叫减色混合。',
  '青（C）吸收红光，品红（M）吸收绿光，黄（Y）吸收蓝光。青 + 品红 = 蓝，品红 + 黄 = 红，青 + 黄 = 绿，三者叠加接近黑。它们恰好是 RGB 三原色的补色。',
  '第四个字母 K（Key，黑版）是单独的黑墨：三色叠出来通常是偏棕的深灰，还会让纸张过湿，用一版黑墨印黑色和文字更纯、更省墨。',
  '画法：先用 difference 混合画出三个圆，再叠一层白色取差，相当于把 RGB 取反（1 − RGB）。这是对理想油墨的近似。'
];
</script>

<template>
  <base-canvas :convert="convert" :colors="colors" :title="title" :intro="intro"/>
</template>
