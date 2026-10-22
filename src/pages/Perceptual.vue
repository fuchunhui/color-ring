<script setup lang="ts">
import {ref} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {
  RING_W,
  RING_H,
  LIGHTNESS_W,
  LIGHTNESS_H,
  hslRing,
  lchRing,
  oklchRing,
  drawRingChart,
  blueToYellow,
  redToCyan,
  drawLightnessRows
} from '../composables/perceptual';

const lchL = ref(70);
const lchC = ref(50);
const okL = ref(0.75);
const okC = ref(0.12);

const drawHsl = (ctx: CanvasRenderingContext2D) => drawRingChart(ctx, hslRing());
const drawLch = (ctx: CanvasRenderingContext2D) => drawRingChart(ctx, lchRing(lchL.value, lchC.value));
const drawOklch = (ctx: CanvasRenderingContext2D) => drawRingChart(ctx, oklchRing(okL.value, okC.value));
</script>

<template>
  <demo-page>
    <demo-section
      title="三种色环：HSL、CIE LCH、OKLCH"
      desc="HSL 色环里每个色相的饱和度、亮度数值都相同，但看上去黄色比蓝色亮得多：下方柱状图显示黄的 Lab L* 约 97，蓝只有约 32。LCH 与 OKLCH 把「感知亮度」单独拿出来作为 L 轴，各色相取同一个 L，看起来亮度一致。注意同一个 L、C 并不是对所有色相都落在 sRGB 色域内，超出的色相用斜线表示。"
    >
      <div class="demo-controls">
        <label>
          LCH 亮度 L*
          <input v-model.number="lchL" type="range" min="20" max="95" step="1">
          <span class="demo-code">{{ lchL }}</span>
        </label>
        <label>
          LCH 色度 C
          <input v-model.number="lchC" type="range" min="0" max="130" step="1">
          <span class="demo-code">{{ lchC }}</span>
        </label>
        <label>
          OKLCH 亮度 L
          <input v-model.number="okL" type="range" min="0.2" max="0.95" step="0.01">
          <span class="demo-code">{{ okL.toFixed(2) }}</span>
        </label>
        <label>
          OKLCH 色度 C
          <input v-model.number="okC" type="range" min="0" max="0.37" step="0.01">
          <span class="demo-code">{{ okC.toFixed(2) }}</span>
        </label>
      </div>
      <demo-canvas title="HSL（S=100%，L=50%）" :width="RING_W" :height="RING_H" :draw="drawHsl"/>
      <demo-canvas title="CIE LCH" :width="RING_W" :height="RING_H" :draw="drawLch"/>
      <demo-canvas title="OKLCH" :width="RING_W" :height="RING_H" :draw="drawOklch"/>
    </demo-section>

    <demo-section
      title="渐变条对比：在不同空间里插值"
      desc="同样的起点和终点，插值空间不同，中间的颜色就不同。sRGB 插值在蓝到黄之间会经过一段发灰的颜色；HSL 绕色环走，饱和但亮度忽明忽暗；Lab、OKLab 沿直线插值，亮度平滑过渡；OKLCH 同时保持色度并按最短路径转色相，过渡最自然。超出 sRGB 色域的部分已被截断到边界。"
    >
      <demo-canvas title="蓝 → 黄" :width="624" :height="170" :draw="blueToYellow"/>
      <demo-canvas title="红 → 青" :width="624" :height="170" :draw="redToCyan"/>
    </demo-section>

    <demo-section
      title="亮度一致性测试"
      desc="上排：HSL 亮度恒定为 50%，但各色块的 Lab L*（感知亮度）从 32 到 97 不等。下排：固定 Lab L* = 70、色度 30，12 个色相的亮度基本一致。"
    >
      <demo-canvas :width="LIGHTNESS_W" :height="LIGHTNESS_H" :draw="drawLightnessRows"/>
    </demo-section>
  </demo-page>
</template>
