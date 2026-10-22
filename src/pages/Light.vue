<script setup lang="ts">
import BaseCanvas from '../components/BaseCanvas.vue';
import {light, colors} from '../composables/light';

const title = '光的三原色：加色混合';
const intro = [
  '红（R）、绿（G）、蓝（B）是光的三原色，对应人眼的三种视锥细胞，也是显示器每个像素里的三个发光点。屏幕自己发光，不同颜色的光叠加后会更亮，这叫加色混合。',
  '红 + 绿 = 黄，绿 + 蓝 = 青，红 + 蓝 = 品红，三者等量叠加 = 白。右侧列出了画面里出现的 7 种颜色。',
  '画法：三个圆心构成等边三角形，在透明画布上用 screen 混合依次绘制。对纯原色来说，screen 与“直接相加”的结果一致。',
  '提示：Canvas 的混合直接作用在 gamma 编码后的 sRGB 数值上，纯原色不受影响；中间色则不等于真实的光能叠加，详见“Gamma与线性光”。点击画布任意位置可读取该点颜色。'
];
</script>

<template>
  <base-canvas :convert="light" :colors="colors" :title="title" :intro="intro"/>
</template>
