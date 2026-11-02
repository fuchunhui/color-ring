<script setup lang="ts">
import {computed, ref} from 'vue';
import {DemoPage, DemoSection, DemoCanvas} from '../components/demo';
import type {Vec3} from '../utils/space';
import {fitRgb, buildMetamer} from '../utils/spectralup';
import {
  PRESETS,
  PLOT_W,
  PLOT_H,
  ILLUM_W,
  ILLUM_H,
  META_W,
  META_H,
  drawFitChart,
  drawIlluminants,
  drawMetamers
} from '../composables/spectralup';
import type {Preset} from '../composables/spectralup';

const r = ref(PRESETS[0].rgb[0]);
const g = ref(PRESETS[0].rgb[1]);
const b = ref(PRESETS[0].rgb[2]);
const adapt = ref(false);
const amount = ref(100);
const period = ref(200);

const channel = (v: number): number => Math.min(255, Math.max(0, Math.round(v) || 0));

const rgb = computed<Vec3>(() => [channel(r.value), channel(g.value), channel(b.value)]);
const fit = computed(() => fitRgb(rgb.value));
const meta = computed(() => buildMetamer(fit.value.spectrum, period.value, amount.value / 100));
const isGray = computed(() => rgb.value[0] === rgb.value[1] && rgb.value[1] === rgb.value[2]);

const pick = (preset: Preset) => {
  [r.value, g.value, b.value] = preset.rgb;
};

const isOn = (preset: Preset): boolean => preset.rgb.every((v, i) => v === rgb.value[i]);

const drawFit = drawFitChart(() => fit.value);
const drawIllum = drawIlluminants(() => fit.value, () => adapt.value);
const drawMeta = drawMetamers(() => fit.value, () => meta.value, () => adapt.value);
</script>

<template>
  <demo-page>
    <demo-section
      title="RGB 还原成光谱：三个数怎么变成一条曲线"
      desc="屏幕上的一个 RGB 值只有三个数，而物体表面的反射率是一条随波长变化的曲线。三个数管不住一条曲线：有无数条不同的曲线在日光下看起来是同一个颜色（第三部分会专门演示）。渲染器想从 RGB 反推光谱时，一般选最平滑的那一条。Jakob 和 Hanika（2019）用的曲线族是 R(λ) = sigmoid(c₀x² + c₁x + c₂)：二次多项式刚好有三个系数，对应三个颜色分量，sigmoid 把结果压在 0 到 1 之间，所以反射率不会为负或超过 100%。这里在页面里用阻尼牛顿法（Levenberg–Marquardt）现场解这三个系数，使曲线在 D65 下的颜色等于所选颜色，从中灰出发分十步走向目标色，每一步解的是 CIELAB 里的差。灰色不用解，直接是一条水平线。越饱和的颜色，曲线越像陡峭的台阶，系数也越大。我试过的颜色（含纯红、纯绿、纯蓝、黑和白）重算误差都小于 0.1 ΔE2000。"
    >
      <div class="demo-controls">
        <label>
          R
          <input v-model.number="r" type="range" min="0" max="255" step="1">
          <span class="demo-code">{{ rgb[0] }}</span>
        </label>
        <label>
          G
          <input v-model.number="g" type="range" min="0" max="255" step="1">
          <span class="demo-code">{{ rgb[1] }}</span>
        </label>
        <label>
          B
          <input v-model.number="b" type="range" min="0" max="255" step="1">
          <span class="demo-code">{{ rgb[2] }}</span>
        </label>
        <span v-if="isGray" class="demo-code">灰色：反射率是常数 {{ fit.spectrum[0].toFixed(3) }}</span>
      </div>
      <div class="su-presets">
        <button
          v-for="item in PRESETS"
          :key="item.name"
          type="button"
          :class="{'su-on': isOn(item)}"
          @click="pick(item)"
        >
          <span class="su-dot" :style="{background: `rgb(${item.rgb.join(',')})`}"/>
          {{ item.name }}
        </button>
      </div>
      <demo-canvas :width="PLOT_W" :height="PLOT_H" :draw="drawFit"/>
    </demo-section>

    <demo-section
      title="同一个 RGB，换一盏灯"
      desc="常见的偷懒做法是把物体的 RGB 逐通道乘上光源的 RGB。这等于假设物体在红、绿、蓝三个通道里各有一个固定的反射率，通道之间互不相干。真实物体的反射率是一条曲线，红色物体在绿光区也有一点反射，灯的光谱在哪里有尖峰、在哪里有缺口，都会改变结果。下面每个色块上半是偷懒算法，下半是用第一部分还原的光谱按波长逐点乘上光源光谱再积分。勾选“眼睛已适应”后，用 Bradford 变换把各光源的白换回 D65 的白：偷懒算法此时恒等于原色，光谱算法仍会偏移，偏移多少就是这盏灯的显色差异。光源曲线与“光源与显色指数”页相同，都是示意；还原出的光谱是最平滑的一条，不是真实物体的测量值，所以 ΔE 只能当作量级参考。"
    >
      <div class="demo-controls">
        <label>
          <input v-model="adapt" type="checkbox">
          眼睛已适应光源（Bradford 换到 D65 白）
        </label>
      </div>
      <demo-canvas :width="ILLUM_W" :height="ILLUM_H" :draw="drawIllum"/>
    </demo-section>

    <demo-section
      title="同色异谱：D65 下一样，换灯就不一样"
      desc="既然三个数不能决定一条曲线，就可以再造出另一条曲线，在 D65 下与第一条给出完全一样的 X、Y、Z。做法：给第一条曲线叠一个正弦起伏，把起伏投影到“X、Y、Z 都看不出来”的方向上（起伏先乘 min(R, 1−R)，保证反射率仍在 0 到 1 之间）。得到的第二条曲线在 D65 下与第一条的 ΔE 只剩浮点误差，换成钨丝灯、荧光灯或 LED，两种“同一个颜色”就分开了。这就是同色异谱，也是为什么衣服在店里灯下和在日光下看起来不一样。起伏幅度和周期不同，分开的程度也不同，可以拖动试试。"
    >
      <div class="demo-controls">
        <label>
          起伏幅度
          <input v-model.number="amount" type="range" min="0" max="100" step="5">
          <span class="demo-code">{{ amount }}%</span>
        </label>
        <label>
          起伏周期
          <input v-model.number="period" type="range" min="60" max="300" step="10">
          <span class="demo-code">{{ period }} nm</span>
        </label>
        <label>
          <input v-model="adapt" type="checkbox">
          眼睛已适应光源
        </label>
        <span class="demo-code">
          {{ meta.peak < 0.005 ? '这个颜色的反射率贴着 0 或 1，没有可起伏的空间' : `最大偏离 ${meta.peak.toFixed(3)}` }}
        </span>
      </div>
      <demo-canvas :width="META_W" :height="META_H" :draw="drawMeta"/>
    </demo-section>
  </demo-page>
</template>

<style lang="less">
.su-presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0 0 10px;
  button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 28px;
    padding: 0 10px;
    font-size: 12px;
    color: #333;
    background: #FFF;
    border: 1px solid #D9D9D9;
    border-radius: 4px;
    cursor: pointer;
    &:hover,
    &.su-on {
      border-color: #4B98F8;
      color: #4B98F8;
    }
  }
  .su-dot {
    width: 14px;
    height: 14px;
    border: 1px solid rgba(0, 0, 0, 0.2);
    border-radius: 50%;
  }
}
</style>
