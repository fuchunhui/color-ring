<script setup lang="ts">
import {ref, computed} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {
  DrawFn,
  drawCurve,
  drawMixing,
  drawGradientCompare,
  drawStripes,
  grayPatch,
  drawBlocks,
  drawRamp,
  STRIPE_W,
  STRIPE_H
} from '../composables/gamma';

const blockSize = ref(2);

const drawSrgbBlocks: DrawFn = (ctx, w, h) => {
  drawBlocks(ctx, w, h, blockSize.value, false);
};

const drawLinearBlocks: DrawFn = (ctx, w, h) => {
  drawBlocks(ctx, w, h, blockSize.value, true);
};

const gray128 = grayPatch(128);
const gray188 = grayPatch(188);

const blockTip = computed(() => `${blockSize.value}×${blockSize.value} 分块`);
</script>

<template>
  <demo-page>
    <demo-section
      title="传递曲线：线性光 → sRGB 编码值"
      desc="屏幕上的数值并不与光强成正比：sRGB 把线性光用近似 2.2 的幂函数（暗部带线性段）编码，使有限的 256 级更多分给人眼敏感的暗部。线性光强 50% 的灰，编码值是 188 而不是 128。"
    >
      <demo-canvas :width="400" :height="360" :draw="drawCurve"/>
    </demo-section>

    <demo-section
      title="混合对比：编码值平均 vs 线性光平均"
      desc="物理上，两束光叠加应该在线性光中相加或平均；而直接对 sRGB 数值取平均会得到偏暗的结果：红绿各 50% 得到 #808000（暗橄榄色），线性光中混合得到 #BCBC00。下方渐变条也一样，sRGB 插值的中间段偏暗、发灰。本项目的 mix()，以及 Canvas 的 screen、multiply 等混合运算，都是直接作用在 gamma 编码值上的。"
    >
      <demo-canvas :width="560" :height="300" :draw="drawMixing"/>
      <demo-canvas :width="560" :height="228" :draw="drawGradientCompare"/>
    </demo-section>

    <demo-section
      title="条纹实验：1px 黑白条纹看起来像哪一块灰？"
      desc="1px 黑白相间的条纹，在远处（或缩小后）会融合成一种灰，它的亮度等于黑白光强的平均，也就是线性光 50%，对应编码值 188，而不是 128。拖动滑块把条纹按 n 像素分块求平均：在线性光中平均才能保持亮度不变，直接平均编码值会让缩小后的图像变暗。"
    >
      <div class="demo-controls">
        <label>
          分块大小 n
          <input v-model.number="blockSize" type="range" min="1" max="8" step="1">
          <span class="demo-code">{{ blockTip }}</span>
        </label>
      </div>
      <demo-canvas title="原始 1px 黑白条纹" :width="STRIPE_W" :height="STRIPE_H" :draw="drawStripes"/>
      <demo-canvas title="灰块：sRGB = 128" :width="STRIPE_W" :height="STRIPE_H" :draw="gray128"/>
      <demo-canvas title="灰块：sRGB = 188（线性 50%）" :width="STRIPE_W" :height="STRIPE_H" :draw="gray188"/>
      <demo-canvas title="按 sRGB 数值平均" :width="STRIPE_W" :height="STRIPE_H" :draw="drawSrgbBlocks"/>
      <demo-canvas title="按线性光平均" :width="STRIPE_W" :height="STRIPE_H" :draw="drawLinearBlocks"/>
    </demo-section>

    <demo-section
      title="灰阶：编码均匀 vs 光强均匀"
      desc="上排每格的 sRGB 数值等差递增，视觉上接近均匀（这正是 gamma 编码的意义）；下排每格的光强等差递增再编码成 sRGB，暗部几格跳变很大，亮部几格几乎看不出差别，说明光强线性并不等于感知线性。数字是每格的 sRGB 编码值。"
    >
      <demo-canvas :width="576" :height="190" :draw="drawRamp"/>
    </demo-section>
  </demo-page>
</template>
