<script setup lang="ts">
import {ref} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {CVD_TYPES, simulate} from '../utils/colorblind';
import {getSource} from '../utils/testimage';

const WIDTH = 220;
const HEIGHT = 150;
const severity = ref(1);

const images = [
  {key: 'wheel', title: '色相盘', desc: '红、绿区域在红绿色盲眼中会收拢成相近的黄褐色，色相盘上本来相隔很远的颜色变得难以区分。'},
  {key: 'rainbow', title: '彩虹条与灰阶', desc: '下方灰阶几乎不变——色觉缺陷主要影响色相，不影响明度。'},
  {key: 'ring', title: '十二色环色块', desc: '十二色环中红、橙、黄绿、绿的色块在红绿色盲下互相接近。'},
  {key: 'redgreen', title: '易混淆的颜色对', desc: '红与绿、橙与黄绿、棕与橄榄绿、粉与灰，是红绿色盲最容易混淆的几组颜色，这也是为什么图表不能只靠红绿区分。'},
  {key: 'ishihara', title: '石原式色盲图', desc: '正常色觉可以看出由橙红色圆点组成的数字“5”；红绿色盲因为分不清橙红与黄绿，数字会消失。'}
];

const variants = [{key: 'normal', label: '原图'}].concat(CVD_TYPES);

const makeDraw = (image: string, type: string) => (ctx: CanvasRenderingContext2D) => {
  const src = getSource(image, WIDTH, HEIGHT);
  ctx.putImageData(type === 'normal' ? src : simulate(src, type, severity.value), 0, 0);
};
</script>

<template>
  <demo-page>
    <demo-section
      title="色盲模拟"
      desc="约 8% 的男性和 0.5% 的女性存在红绿色觉缺陷。这里按 Machado 等人（2009）的模型模拟：把 sRGB 解码为线性光，乘以 3×3 矩阵，再编码回 sRGB。它是对真实色觉的近似，不同个体之间差异很大，只适合用来检查配色是否容易混淆。"
    >
      <div class="demo-controls">
        <label>
          严重程度
          <input v-model.number="severity" type="range" min="0" max="1" step="0.05">
          <span class="demo-code">{{ severity.toFixed(2) }}</span>
        </label>
      </div>
    </demo-section>

    <demo-section
      v-for="image in images"
      :key="image.key"
      :title="image.title"
      :desc="image.desc"
    >
      <demo-canvas
        v-for="variant in variants"
        :key="variant.key"
        :title="variant.label"
        :width="WIDTH"
        :height="HEIGHT"
        :draw="makeDraw(image.key, variant.key)"
      />
    </demo-section>
  </demo-page>
</template>
