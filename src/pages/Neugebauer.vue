<script setup lang="ts">
import {computed, ref} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import type {DrawFn} from '../utils/spectral';
import {rgbCss, rgbHex} from '../utils/spectral';
import {
  apparentArea,
  invertColor,
  mechanicalGain,
  naiveColor,
  predictSpectrum,
  spectrumColor
} from '../utils/neugebauer';
import {
  BARS_W,
  BARS_H,
  CURVE_W,
  CURVE_H,
  RAMP_W,
  RAMP_H,
  DOT_SIZE,
  DOT_CELLS,
  drawDemichel,
  drawGainCurve,
  drawRamp,
  drawDots
} from '../composables/neugebauer';

const cyan = ref(60);
const magenta = ref(30);
const yellow = ref(80);
const useGain = ref(false);
const gain = ref(0.18);
const yn = ref(1.8);
const dotArea = ref(0.5);
const scatter = ref(2.5);

const effective = computed(() => {
  const list = [cyan.value, magenta.value, yellow.value].map(v => v / 100);
  return useGain.value ? list.map(v => mechanicalGain(v, gain.value)) : list;
});

const swatches = computed(() => {
  const [c, m, y] = effective.value;
  return [
    {label: 'Neugebauer（n = 1）', rgb: spectrumColor(predictSpectrum(c, m, y, 1))},
    {label: `Yule–Nielsen（n = ${yn.value.toFixed(1)}）`, rgb: spectrumColor(predictSpectrum(c, m, y, yn.value))},
    {label: '8 种原色的 sRGB 值按面积加权', rgb: naiveColor(c, m, y)},
    {label: '1 − RGB（简化取反）', rgb: invertColor(c, m, y)}
  ];
});

const demichelDraw: DrawFn = ctx => {
  const [c, m, y] = effective.value;
  drawDemichel(ctx, c, m, y);
};
const curveDraw: DrawFn = ctx => drawGainCurve(ctx, gain.value, yn.value);
const cyanRampDraw: DrawFn = ctx => drawRamp(ctx, 'cyan', gain.value, yn.value);
const grayRampDraw: DrawFn = ctx => drawRamp(ctx, 'gray', gain.value, yn.value);
const idealDraw: DrawFn = ctx => drawDots(ctx, 'ideal', dotArea.value, gain.value, yn.value, scatter.value);
const gainDraw: DrawFn = ctx => drawDots(ctx, 'gain', dotArea.value, gain.value, yn.value, scatter.value);
const opticalDraw: DrawFn = ctx => drawDots(ctx, 'optical', dotArea.value, gain.value, yn.value, scatter.value);

const mechanical = computed(() => mechanicalGain(dotArea.value, gain.value));
const apparent = computed(() => apparentArea(mechanical.value, yn.value));
const pct = (v: number): string => `${(v * 100).toFixed(1)}%`;
</script>

<template>
  <demo-page>
    <demo-section
      title="从三个网点面积预测颜色"
      desc="半色调印刷里，青、品红、黄三个网版的网点随机叠在一起，每一小块纸面上只会出现 8 种情形之一：纸白、单色、两色叠印、三色叠印。Demichel 给出每种情形占的面积比例（假设网点互相独立），Neugebauer 方程就是把 8 种情形的反射率按这些面积加权平均。这是对印刷网点页的理论补充：网点页是“看”，这里是“算”。8 种原色的光谱由示意的油墨透射率曲线相乘得到，不是实测值。"
    >
      <div class="demo-controls">
        <label>
          青 C
          <input v-model.number="cyan" type="range" min="0" max="100" step="1">
          <span class="demo-code">{{ cyan }}%</span>
        </label>
        <label>
          品红 M
          <input v-model.number="magenta" type="range" min="0" max="100" step="1">
          <span class="demo-code">{{ magenta }}%</span>
        </label>
        <label>
          黄 Y
          <input v-model.number="yellow" type="range" min="0" max="100" step="1">
          <span class="demo-code">{{ yellow }}%</span>
        </label>
        <label>
          <input v-model="useGain" type="checkbox">
          先计入机械网点扩大
        </label>
      </div>
      <demo-canvas :width="BARS_W" :height="BARS_H" :draw="demichelDraw"/>
      <div class="nb-swatches">
        <div v-for="s in swatches" :key="s.label" class="nb-swatch">
          <i class="demo-swatch nb-block" :style="{background: rgbCss(s.rgb)}"/>
          <span>{{ s.label }}</span>
          <span class="demo-code">{{ rgbHex(s.rgb) }}</span>
        </div>
      </div>
    </demo-section>

    <demo-section
      title="网点扩大：为什么印出来总是偏暗"
      desc="50% 的网点印出来，看起来往往像 65% 以上，这叫网点扩大，有两个来源：机械扩大是油墨在纸上被压得更大；光学扩大是光线进入纸张后在纸纤维里横向扩散，网点周围的纸白部分也被“染暗”了一点（光陷阱）。Yule–Nielsen 修正就是用 n 次根来描述光学扩大：R^(1/n) = Σ wᵢ · Rᵢ^(1/n)，n = 1 就是未修正的 Neugebauer 方程，实际印刷中 n 通常在 1.7 到 2 之间。表观网点面积是用 Murray–Davies 公式 (纸白 − 实测) / (纸白 − 实地) 从明度反推出来的。拖动滑块观察曲线变化。"
    >
      <div class="demo-controls">
        <label>
          机械扩大 g
          <input v-model.number="gain" type="range" min="0" max="0.3" step="0.01">
          <span class="demo-code">{{ gain.toFixed(2) }}</span>
        </label>
        <label>
          Yule–Nielsen n
          <input v-model.number="yn" type="range" min="1" max="3" step="0.1">
          <span class="demo-code">{{ yn.toFixed(1) }}</span>
        </label>
      </div>
      <demo-canvas :width="CURVE_W" :height="CURVE_H" :draw="curveDraw"/>
    </demo-section>

    <demo-section
      title="色条：理想、机械扩大、再加光学扩大"
      desc="每组三行。第一行是理想状态（网点面积均匀增加，n = 1）；第二行加入机械扩大；第三行再加入 Yule–Nielsen 光学扩大。中间调的颜色明显变深，灰平衡也会偏色，印刷厂用网点扩大补偿曲线来抵消它。"
    >
      <demo-canvas :width="RAMP_W" :height="RAMP_H" :draw="cyanRampDraw"/>
      <demo-canvas :width="RAMP_W" :height="RAMP_H" :draw="grayRampDraw"/>
    </demo-section>

    <demo-section
      title="放大的网点"
      :desc="`同一块 ${DOT_CELLS} × ${DOT_CELLS} 网点的青版。左：理想网点；中：油墨被压大的机械扩大；右：在机械扩大的基础上，再模拟光线在纸张里的扩散（高斯模糊）并按 Yule–Nielsen 公式混合，也就是人眼离远看到的样子。`"
    >
      <div class="demo-controls">
        <label>
          标称网点面积
          <input v-model.number="dotArea" type="range" min="0.05" max="0.75" step="0.01">
          <span class="demo-code">{{ pct(dotArea) }}</span>
        </label>
        <label>
          纸张内光散射
          <input v-model.number="scatter" type="range" min="0" max="6" step="0.5">
          <span class="demo-code">{{ scatter.toFixed(1) }} px</span>
        </label>
        <span class="demo-code">
          机械扩大后 {{ pct(mechanical) }}，加上光学扩大后的表观面积 {{ pct(apparent) }}
        </span>
      </div>
      <demo-canvas title="理想网点" :width="DOT_SIZE" :height="DOT_SIZE" :draw="idealDraw"/>
      <demo-canvas title="机械网点扩大" :width="DOT_SIZE" :height="DOT_SIZE" :draw="gainDraw"/>
      <demo-canvas title="光在纸里扩散后" :width="DOT_SIZE" :height="DOT_SIZE" :draw="opticalDraw"/>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.nb-swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 24px;
  margin: 4px 0 8px;
}
.nb-swatch {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.nb-block {
  width: 44px;
  height: 44px;
}
</style>
