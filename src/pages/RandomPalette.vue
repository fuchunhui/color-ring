<script setup lang="ts">
import {computed} from 'vue';
import BaseCanvas from '../components/BaseCanvas.vue';
import {convert, colors} from '../composables/random-palette';

const randomColors = computed(() => {
  return colors;
});

const title = '嘿，动起来';
const intro = [
  '同样是六边形蜂窝，这次有 331 格（中心 1 格，向外 10 圈），每个格子的颜色都是随机的 24 位色。',
  '每隔 0.1 秒随机点亮一批格子，批量逐步增加：第 1 次 1 格，第 2 次 2 格……最多每次 6 格，直到铺满。',
  '每次进入页面都会重新随机，右侧列表按点亮的先后顺序追加颜色。'
];
</script>

<template>
  <base-canvas :convert="convert" :colors="randomColors" :title="title" :intro="intro"/>
</template>
