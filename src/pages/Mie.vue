<script setup lang="ts">
import {computed, ref} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import type {DrawFn} from '../utils/spectral';
import {rgbCss, rgbHex} from '../utils/spectral';
import {
  MEDIA,
  PLOT_W,
  PLOT_H,
  STRIP_W,
  STRIP_H,
  radiusFromSlider,
  efficiencies,
  sideColor,
  transmitColor,
  drawEfficiency,
  drawSweep
} from '../composables/mie';

const slider = ref(0.2);
const mediumIndex = ref(1);
const tau = ref(1);

const medium = computed(() => MEDIA[mediumIndex.value]);
const radius = computed(() => radiusFromSlider(slider.value));
const curves = computed(() => efficiencies(medium.value, radius.value));
const side = computed(() => sideColor(curves.value));
const through = computed(() => transmitColor(curves.value, tau.value));

const radiusText = computed(() => {
  const r = radius.value;
  return r < 1 ? `${(r * 1000).toFixed(0)} nm` : `${r.toFixed(2)} µm`;
});

const effDraw: DrawFn = (ctx, w, h) => drawEfficiency(() => curves.value)(ctx, w, h);
const sweepDraw: DrawFn = (ctx, w, h) => drawSweep(() => medium.value, () => tau.value, () => slider.value)(ctx, w, h);
</script>

<template>
  <demo-page>
    <demo-section
      title="散射的颜色：粒子多大，决定了光变成什么色"
      desc="光遇到比波长小得多的颗粒（空气分子、烟、很稀的牛奶），散射遵循瑞利规律，强度正比于 λ⁻⁴，蓝光被散射得远多于红光：侧面看是淡蓝色，光穿过去则剩下偏红的光（天空蓝与日落红，丁达尔效应）。颗粒大到和波长相当（约 0.2~2 µm）时，需要用 Mie 理论完整计算，波长依赖变得弱而且有起伏；颗粒再大（几微米以上，如云、雾里的水滴），各个波长散射得差不多，于是呈现白色。下面的 Qsca 用 Bohren–Huffman 的 BHMIE 算法算出，尺寸参数 x = 2πr / λ（λ 是颗粒周围介质里的波长）。"
    >
      <div class="demo-controls">
        <label>
          颗粒半径
          <input v-model.number="slider" type="range" min="0" max="1" step="0.005">
          <span class="demo-code">{{ radiusText }}</span>
        </label>
        <label>
          颗粒与介质
          <select v-model.number="mediumIndex">
            <option v-for="(m, i) in MEDIA" :key="m.key" :value="i">{{ m.name }}</option>
          </select>
        </label>
        <label>
          光程上的颗粒量（550nm 处光学厚度）
          <input v-model.number="tau" type="range" min="0.1" max="4" step="0.1">
          <span class="demo-code">{{ tau.toFixed(1) }}</span>
        </label>
      </div>
      <p class="mie-note">
        {{ medium.name }}：{{ medium.note }}
      </p>
      <div class="mie-swatches">
        <span>
          <span class="demo-swatch" :style="{background: rgbCss(side)}"/>
          侧面看到的散射光 {{ rgbHex(side) }}（亮度固定，仅看色调）
        </span>
        <span>
          <span class="demo-swatch" :style="{background: rgbCss(through)}"/>
          穿过去的光 {{ rgbHex(through) }}
        </span>
      </div>
      <demo-canvas title="散射效率随波长" :width="PLOT_W" :height="PLOT_H" :draw="effDraw"/>
    </demo-section>

    <demo-section
      title="颗粒从小到大扫一遍"
      desc="横轴是颗粒半径（10 nm 到 20 µm，对数坐标），上排是侧面看到的散射光颜色，下排是穿过颗粒悬浮层之后的光颜色（光学厚度由上面的滑块决定）。小颗粒一端：侧面偏蓝，透过的光偏黄红；半径到 0.1~0.5 µm 之后蓝色越来越淡；半径大于约 1 µm 之后，侧面和透射都趋近白色或灰色。小黑三角指示当前半径。"
    >
      <demo-canvas :width="STRIP_W" :height="STRIP_H" :draw="sweepDraw"/>
    </demo-section>

    <demo-section
      title="蓝色的眼睛：结构，不是色素"
      desc="虹膜里并没有蓝色色素。虹膜基质层里的微小结构散射光，短波长被散射得更多；虹膜后面有一层黑色素把大部分没被散射的光吸收掉，我们看到的就是被散射回来的偏蓝的光。黑色素多的眼睛则主要吸收光，呈棕色。散射的具体机理和程度仍有研究，这里不做定量计算，上面的 Mie 曲线只是帮助理解“小颗粒偏蓝”这个方向。"
    />
  </demo-page>
</template>

<style lang="less">
.mie-note {
  margin: 0 0 8px;
  font-size: 13px;
  color: #666;
}
.mie-swatches {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 28px;
  margin-bottom: 12px;
  font-size: 13px;
}
</style>
