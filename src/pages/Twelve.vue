<script setup lang="ts">
import BaseCanvas from '../components/BaseCanvas.vue';
import {twelve, colors} from '../composables/twelve';

const title = '十二色环（RGB模型）';
const intro = [
  '把色相（Hue）按 360° 均分成 12 份，每格 30°，饱和度和明度都取最大，就得到 RGB 十二色环。顶部是红色，顺时针排列。',
  '红（0°）、绿（120°）、蓝（240°）是原色；黄（60°）、青（180°）、品红（300°）是二次色，即两个原色等量叠加；其余是三次色，例如橙色 30°。',
  '正对面的两色互为补色：红 ↔ 青，黄 ↔ 蓝，绿 ↔ 品红。补色等量叠加得到白光。',
  '注意：这是光的色环，补色关系与美术色环不同（美术里红 ↔ 绿），见“伊登十二色环”。'
];
</script>

<template>
  <base-canvas :convert="twelve" :colors="colors" :title="title" :intro="intro"/>
</template>
