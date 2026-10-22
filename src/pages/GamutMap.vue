<script setup lang="ts">
import {ref, computed} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import {Vec3, rgbToLab} from '../utils/space';
import {deltaE2000} from '../utils/deltae';
import {isInSrgb, oklchToLab, clipMap, chromaReduceMap, css4Map} from '../utils/gamut';
import {
  SLICE_W,
  SLICE_H,
  SWEEP_W,
  SWEEP_H,
  XY_W,
  XY_H,
  drawSlice,
  drawSweep,
  drawChromaticity
} from '../composables/gamutmap';

const lightness = ref(0.72);
const chroma = ref(0.3);
const hue = ref(145);

const target = computed<Vec3>(() => [lightness.value, chroma.value, hue.value]);
const inGamut = computed(() => isInSrgb(target.value));
const results = computed(() => ({
  clip: clipMap(target.value),
  chroma: chromaReduceMap(target.value),
  css4: css4Map(target.value)
}));

const toHex = (rgb: Vec3) => '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
const css = (rgb: Vec3) => `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;

const cards = computed(() => {
  const origin = oklchToLab(target.value);
  const list: [string, Vec3, Vec3][] = [
    ['截断各通道', results.value.clip.rgb, results.value.clip.oklch],
    ['降低 CIE LCH 色度', results.value.chroma.rgb, results.value.chroma.oklch],
    ['CSS Color 4 映射', results.value.css4.rgb, results.value.css4.oklch]
  ];
  return list.map(([name, rgb, oklch]) => ({
    name,
    rgb,
    hex: toHex(rgb),
    oklch: `oklch(${oklch[0].toFixed(3)} ${oklch[1].toFixed(3)} ${oklch[2].toFixed(0)})`,
    de: deltaE2000(origin, rgbToLab(rgb))
  }));
});

const drawSliceCanvas = (ctx: CanvasRenderingContext2D) => {
  drawSlice(ctx, hue.value, target.value, results.value);
};
const drawSweepCanvas = (ctx: CanvasRenderingContext2D) => {
  drawSweep(ctx, lightness.value, hue.value);
};
const drawXyCanvas = (ctx: CanvasRenderingContext2D) => {
  drawChromaticity(ctx, target.value, results.value);
};
</script>

<template>
  <demo-page>
    <demo-section
      title="把色域外的颜色放进 sRGB"
      desc="OKLCH、Display P3、Rec.2020 能表示比 sRGB 更鲜艳的颜色，放到只支持 sRGB 的屏幕上时必须处理。直接把各通道截断到 0~1 最简单，但三个通道被分别压扁，色相和亮度都会偏移。更好的做法是保持亮度和色相、只降低色度，直到颜色刚好落进色域；CSS Color 4 的算法在 OKLCH 里二分色度，并允许结果与原色相差不超过一个可察觉的最小差（ΔE_OK < 0.02）。拖动滑块观察三种结果的差别。"
    >
      <div class="demo-controls">
        <label>
          亮度 L
          <input v-model.number="lightness" type="range" min="0" max="1" step="0.01">
          <span class="demo-code">{{ lightness.toFixed(2) }}</span>
        </label>
        <label>
          色度 C
          <input v-model.number="chroma" type="range" min="0" max="0.4" step="0.005">
          <span class="demo-code">{{ chroma.toFixed(3) }}</span>
        </label>
        <label>
          色相 h
          <input v-model.number="hue" type="range" min="0" max="360" step="1">
          <span class="demo-code">{{ hue }}°</span>
        </label>
        <span class="demo-code">
          oklch({{ lightness.toFixed(2) }} {{ chroma.toFixed(3) }} {{ hue }})
          {{ inGamut ? '在 sRGB 内' : '超出 sRGB' }}
        </span>
      </div>
      <div class="gamut-cards">
        <div class="gamut-card">
          <div class="gamut-swatch" :style="{background: css(results.clip.rgb)}"/>
          <p>原始颜色（屏幕只能近似显示）</p>
          <p class="demo-code">
            {{ inGamut ? '无需映射' : '色域外' }}
          </p>
        </div>
        <div v-for="card in cards" :key="card.name" class="gamut-card">
          <div class="gamut-swatch" :style="{background: css(card.rgb)}"/>
          <p>{{ card.name }}</p>
          <p class="demo-code">
            {{ card.hex }}
          </p>
          <p class="demo-code">
            {{ card.oklch }}
          </p>
          <p class="demo-code">
            ΔE2000 {{ card.de.toFixed(2) }}
          </p>
        </div>
      </div>
      <p class="gamut-note">
        ΔE2000 是映射结果与原色（未截断的 Lab 值）之间的差；原色在 sRGB 外时，它只说明颜色被改动了多少，不能说明哪个结果更好看。
      </p>
    </demo-section>

    <demo-section
      title="OKLCH 色相切片与映射路径"
      desc="横轴是色度 C，纵轴是亮度 L，灰色斜纹区域在 sRGB 之外。截断（红）的落点会偏离原来的亮度和色度；降低 CIE LCH 色度（蓝）沿一条略弯的曲线收缩，因为 CIE Lab 和 OKLab 对同一色相的看法不完全一致；CSS4 映射（绿）先沿水平线降色度，最后再截断一小步。"
    >
      <demo-canvas title="色相切片" :width="SLICE_W" :height="SLICE_H" :draw="drawSliceCanvas"/>
      <demo-canvas title="CIE xy 色度图中的位置" :width="XY_W" :height="XY_H" :draw="drawXyCanvas"/>
    </demo-section>

    <demo-section
      title="色度从 0 增加时的截断与映射"
      desc="固定亮度和色相，色度逐渐增大。进入色域外之后，直接截断的颜色不再变得更鲜艳，色相会悄悄偏移，出现条带；CSS4 映射在边界处保持颜色连续。"
    >
      <demo-canvas :width="SWEEP_W" :height="SWEEP_H" :draw="drawSweepCanvas"/>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.gamut-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.gamut-card {
  width: 170px;
  font-size: 12px;
  line-height: 20px;
  .gamut-swatch {
    height: 90px;
    border: 1px solid #DDDEE4;
    margin-bottom: 4px;
  }
}
.gamut-note {
  max-width: 900px;
  margin-top: 8px;
  font-size: 12px;
  line-height: 18px;
  color: #888;
}
</style>
